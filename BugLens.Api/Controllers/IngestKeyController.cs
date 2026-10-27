
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.IngestKeys;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BugLens.Api.Controllers;

[ApiController]
[Route("api/v1/projects/{projectId}/keys")]
[Authorize]
public class IngestKeysController : ControllerBase
{
    private readonly IIngestKeyService _keys;
    private readonly IProjectMemberService _members;
    private readonly IMongoCollection<Project> _projects;

    public IngestKeysController(
        IIngestKeyService keys,
        IProjectMemberService members,
        IMongoDatabase database)
    {
        _keys = keys;
        _members = members;
        _projects = database.GetCollection<Project>("projects");
    }

    [HttpGet]
    public async Task<IActionResult> List(
        string projectId,
        CancellationToken ct)
    {
        if (!ObjectId.TryParse(projectId, out _))
            return NotFound();

        if (!await ProjectExistsAsync(projectId, ct))
            return NotFound();

        var userId = User.FindFirst("sub")?.Value;
        var isAdmin = User.IsInRole(Roles.Admin);

        if (!isAdmin &&
            (userId is null ||
             !await _members.IsMemberAsync(projectId, userId, ct)))
        {
            return Forbid();
        }

        var keys = await _keys.ListAsync(
            projectId,
            isAdmin ? null : userId,
            ct);

        var response = keys.Select(x => new IngestKeyResponse(
            x.Id,
            x.ProjectId,
            x.OwnerUserId,
            x.Name,
            x.KeyPrefix,
            x.CreatedAt,
            x.LastUsedAt,
            x.RevokedAt));

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        string projectId,
        CreateIngestKeyRequest request,
        CancellationToken ct)
    {
        if (!ObjectId.TryParse(projectId, out _))
            return NotFound();

        if (!await ProjectExistsAsync(projectId, ct))
            return NotFound(new { message = "Project not found." });

        var userId = User.FindFirst("sub")?.Value;
        if (userId is null)
            return Unauthorized();

        // Keys belong to members (validation checks membership too). Admins could add
        // themselves anyway, so they join on their first key instead of getting a 403.
        if (!await _members.IsMemberAsync(projectId, userId, ct))
        {
            if (!User.IsInRole(Roles.Admin))
                return Forbid();

            await _members.AddMemberAsync(projectId, userId, userId, ct);
        }

        var created = await _keys.CreateAsync(
            projectId,
            userId,
            request.Name,
            ct);

        Response.Headers.CacheControl = "no-store";

        var response = new CreatedIngestKeyResponse(
            created.Key.Id,
            created.Key.ProjectId,
            created.Key.OwnerUserId,
            created.Key.Name,
            created.Key.KeyPrefix,
            created.Key.CreatedAt,
            created.Secret);

        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpDelete("{keyId}")]
    public async Task<IActionResult> Revoke(
        string projectId,
        string keyId,
        CancellationToken ct)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(keyId, out _))
        {
            return NotFound();
        }

        if (!await ProjectExistsAsync(projectId, ct))
            return NotFound();

        var userId = User.FindFirst("sub")?.Value;
        var isAdmin = User.IsInRole(Roles.Admin);

        if (!isAdmin &&
            (userId is null ||
             !await _members.IsMemberAsync(projectId, userId, ct)))
        {
            return Forbid();
        }

        var revoked = await _keys.RevokeAsync(
            projectId,
            keyId,
            isAdmin ? null : userId,
            ct);

        return revoked ? NoContent() : NotFound();
    }

    private Task<bool> ProjectExistsAsync(
        string projectId,
        CancellationToken ct)
        => _projects.Find(x => x.Id == projectId).AnyAsync(ct);
}
