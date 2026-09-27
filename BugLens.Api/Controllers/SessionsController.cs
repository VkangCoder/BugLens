using BugLens.Api.Interfaces;
using BugLens.Api.Mappers;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Sessions;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace BugLens.Api.Controllers;

[Route("api/v1/sessions")]
[ApiController]
public class SessionsController(IBugSessionService sessionService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var sessions = await sessionService.GetAllAsync(ct);
        var response = sessions.Select(SessionMapper.ToResponse).ToList();
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var session = await sessionService.GetByIdAsync(id, ct);

        if (session is null)
            return NotFound();

        return Ok(SessionMapper.ToResponse(session));
    }

    [HttpPost]
    public async Task<IActionResult> Post(
        [FromBody] CreateSessionRequest request,
        CancellationToken ct)
    {
        var session = new BugSession
        {
            ProjectId = request.ProjectId,
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
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var deleted = await sessionService.DeleteAsync(id, ct);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}