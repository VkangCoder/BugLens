using BugLens.Api.Auth;
using BugLens.Api.Interfaces;
using BugLens.Api.Mappers;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace BugLens.Api.Controllers;

[Route("api/v1/sessions")]
[ApiController]
public class SessionsController(IBugSessionService sessionService) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll([FromQuery] SessionListQuery query, CancellationToken ct)
    {
        var response = await sessionService.GetSummariesAsync(query, ct);
        return Ok(response);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var session = await sessionService.GetByIdAsync(id, ct);

        if (session is null)
            return NotFound();

        return Ok(SessionMapper.ToResponse(session));
    }

    [HttpPost]
    [Authorize(AuthenticationSchemes = ApiKeyDefaults.Scheme)]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Post(
        [FromBody] CreateSessionRequest request,
        CancellationToken ct)
    {
        // projectId comes from the authenticated API key, never from the body
        var projectId = User.FindFirst(ApiKeyDefaults.ProjectIdClaim)?.Value;
        if (projectId is null) return Unauthorized();

        var session = new BugSession
        {
            ProjectId = projectId,
            StartedAt = request.StartedAt,
            EndedAt = request.EndedAt,
            InitialUrl = request.InitialUrl,
            Browser = request.Browser,
            Viewport = request.Viewport,
            CreatedAt = DateTime.UtcNow,
            Events = request.Events.Select(e => new BugEvent
            {
                Type = e.Type,
                Timestamp = e.Timestamp,
                Url = e.Url,
                Data = BsonDocument.Parse(e.Data.GetRawText())
            }).ToList()
        };

        var createdSession = await sessionService.CreateAsync(session, ct);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdSession.Id },
            SessionMapper.ToResponse(createdSession));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var deleted = await sessionService.DeleteAsync(id, ct);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}