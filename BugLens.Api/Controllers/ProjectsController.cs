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
    [Authorize] // Dev and Admin can both list projects (no hash, no key)
    public async Task<ActionResult<IReadOnlyList<ProjectResponse>>> List(CancellationToken ct)
        => Ok(await projects.ListAsync(ct));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ProjectWithKeyResponse>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var created = await projects.CreateAsync(request.Name, ct);
        Response.Headers.CacheControl = "no-store"; // the response carries a secret
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
}
