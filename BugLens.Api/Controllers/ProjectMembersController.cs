
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.ProjectMembers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BugLens.Api.Controllers;

[ApiController]
[Route("api/v1/projects/{projectId}/members")]
[Authorize]
public class ProjectMembersController : ControllerBase
{
    private readonly IProjectMemberService _members;
    private readonly IMongoCollection<Project> _projects;
    private readonly IMongoCollection<AppUser> _users;

    public ProjectMembersController(
        IProjectMemberService members,
        IMongoDatabase database)
    {
        _members = members;
        _projects = database.GetCollection<Project>("projects");
        _users = database.GetCollection<AppUser>("users");
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

        var currentUserId = User.FindFirst("sub")?.Value;
        var isAdmin = User.IsInRole(Roles.Admin);

        if (!isAdmin &&
            (currentUserId is null ||
             !await _members.IsMemberAsync(projectId, currentUserId, ct)))
        {
            return Forbid();
        }

        var memberships = await _members.ListAsync(projectId, ct);
        var userIds = memberships.Select(x => x.UserId).Distinct().ToList();

        var users = await _users
            .Find(x => userIds.Contains(x.Id))
            .Project(x => new { x.Id, x.Name, x.Role })
            .ToListAsync(ct);

        var usersById = users.ToDictionary(x => x.Id);

        var response = memberships
            .Where(m => usersById.ContainsKey(m.UserId))
            .Select(m =>
            {
                var user = usersById[m.UserId];

                return new ProjectMemberResponse(
                    m.UserId,
                    user.Name,
                    user.Role,
                    m.AddedByUserId,
                    m.CreatedAt);
            })
            .ToList();

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Add(
        string projectId,
        AddProjectMemberRequest request,
        CancellationToken ct)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(request.UserId, out _))
        {
            return BadRequest(new { message = "Invalid project or user ID." });
        }

        if (!await ProjectExistsAsync(projectId, ct))
            return NotFound(new { message = "Project not found." });

        var userExists = await _users
            .Find(x => x.Id == request.UserId)
            .AnyAsync(ct);

        if (!userExists)
            return NotFound(new { message = "User not found." });

        var adminId = User.FindFirst("sub")?.Value;
        if (adminId is null)
            return Unauthorized();

        var added = await _members.AddMemberAsync(
            projectId,
            request.UserId,
            adminId,
            ct);

        if (!added)
            return Conflict(new { message = "User is already a project member." });

        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpDelete("{userId}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Remove(
        string projectId,
        string userId,
        CancellationToken ct)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(userId, out _))
        {
            return NotFound();
        }

        if (!await ProjectExistsAsync(projectId, ct))
            return NotFound();

        var removed = await _members.RemoveMemberAsync(projectId, userId, ct);

        return removed ? NoContent() : NotFound();
    }

    private Task<bool> ProjectExistsAsync(
        string projectId,
        CancellationToken ct)
        => _projects.Find(x => x.Id == projectId).AnyAsync(ct);
}
