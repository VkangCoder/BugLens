using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugLens.Api.Controllers;

[ApiController]
[Route("api/v1/projects")]
public class ProjectsController(
    IProjectService projects,
    IProjectMemberService members,
    IIngestKeyService keys,
    IBugSessionService sessions) : ControllerBase
{
    // Admins see every project; everyone else only the projects they are a member of
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<ProjectResponse>>> List(CancellationToken ct)
    {
        var userId = User.FindFirst("sub")?.Value;
        if (userId is null) return Unauthorized();

        var visible = User.IsInRole(Roles.Admin)
            ? await projects.ListAsync(null, ct)
            : await projects.ListAsync(await members.ListProjectIdsAsync(userId, ct), ct);

        var ids = visible.Select(p => p.Id).ToList();
        var memberCounts = await members.CountByProjectAsync(ids, ct);
        var myKeys = await keys.CountActiveAsync(userId, ids, ct);
        var stats = await sessions.GetProjectStatsAsync(ids, ct);

        return Ok(visible.Select(p =>
        {
            var s = stats.GetValueOrDefault(p.Id);
            return p with
            {
                MemberCount = memberCounts.GetValueOrDefault(p.Id),
                MyActiveKeyCount = myKeys.GetValueOrDefault(p.Id),
                SessionCount = s?.Count ?? 0,
                ErrorSessionCount = s?.ErrorCount ?? 0,
                LastSessionAt = s?.LastStartedAt,
            };
        }).ToList());
    }

    // The creator becomes a member, so they can create their own ingest key right away
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var created = await projects.CreateAsync(request.Name, ct);

        var adminId = User.FindFirst("sub")?.Value;
        if (adminId is not null)
            await members.AddMemberAsync(created.Id, adminId, adminId, ct);

        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        if (!await projects.DeleteAsync(id, ct)) return NotFound();

        await members.RemoveProjectAsync(id, ct);
        return NoContent();
    }
}
