using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugLens.Api.Controllers;

[ApiController]
[Route("api/v1/projects")]
public class ProjectsController(IProjectService projects) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<ProjectResponse>>> List(CancellationToken ct)
        => Ok(await projects.ListAsync(ct));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProjectWithKeyResponse>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var created = await projects.CreateAsync(request.Name, ct);
        Response.Headers.CacheControl = "no-store"; // response contains a secret
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPost("{id}/rotate-key")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProjectWithKeyResponse>> RotateKey(string id, CancellationToken ct)
    {
        var rotated = await projects.RotateKeyAsync(id, ct);
        if (rotated is null) return NotFound();

        Response.Headers.CacheControl = "no-store";
        return Ok(rotated);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
        => await projects.DeleteAsync(id, ct) ? NoContent() : NotFound();
}