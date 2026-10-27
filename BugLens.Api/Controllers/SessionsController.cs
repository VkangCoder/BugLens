using BugLens.Api.Auth;
using BugLens.Api.Interfaces;
using BugLens.Api.Mappers;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using System.Text.Json;

namespace BugLens.Api.Controllers;

[Route("api/v1/sessions")]
[ApiController]
[Authorize]
public class SessionsController(
    IBugSessionService sessionService,
    IProjectService projectService,
    IProjectMemberService memberService) : ControllerBase
{
    private const int MaxEvents = 10_000;

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll([FromQuery] SessionListQuery query, CancellationToken ct)
    {
        IReadOnlyCollection<string>? allowedProjectIds = null;
        if (!User.IsInRole(Roles.Admin))
        {
            var userId = User.FindFirst("sub")?.Value;
            if (userId is null) return Unauthorized();

            allowedProjectIds = await memberService.ListProjectIdsAsync(userId, ct);
        }

        var response = await sessionService.GetSummariesAsync(query, allowedProjectIds, ct);

        var names = await projectService.GetNamesAsync(response.Items.Select(s => s.ProjectId), ct);
        foreach (var item in response.Items)
            item.ProjectName = names.GetValueOrDefault(item.ProjectId);

        return Ok(response);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var session = await sessionService.GetByIdAsync(id, ct);

        if (session is null)
            return NotFound();

        // 404 rather than 403, so non-members can't tell the session exists
        if (!User.IsInRole(Roles.Admin))
        {
            var userId = User.FindFirst("sub")?.Value;
            if (userId is null) return Unauthorized();

            if (!await memberService.IsMemberAsync(session.ProjectId, userId, ct))
                return NotFound();
        }

        var response = SessionMapper.ToResponse(session);
        var names = await projectService.GetNamesAsync([session.ProjectId], ct);
        response.ProjectName = names.GetValueOrDefault(session.ProjectId);

        return Ok(response);
    }

    [HttpPost]
    [Authorize(AuthenticationSchemes = ApiKeyDefaults.Scheme)]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Post(
        [FromBody] CreateSessionRequest request,
        CancellationToken ct)
    {
        var projectId = User.FindFirst(ApiKeyDefaults.ProjectIdClaim)?.Value;
        if (projectId is null) return Unauthorized();

        if (request.Events.Count is 0 or > MaxEvents)
            return Invalid("Invalid events", $"Send between 1 and {MaxEvents} events.");

        var events = new List<BugEvent>(request.Events.Count);

        foreach (var e in request.Events)
        {

            if (e.Data.ValueKind != JsonValueKind.Object)
                return Invalid("Invalid event", "Every event must have a 'data' object.");

            BsonDocument data;
            try
            {
                data = BsonDocument.Parse(e.Data.GetRawText());
            }
            catch (Exception ex) when (ex is FormatException or BsonException)
            {
                return Invalid("Invalid event", "An event 'data' object could not be stored.");
            }

            events.Add(new BugEvent
            {
                Type = e.Type,
                Timestamp = e.Timestamp,
                Url = e.Url,
                Data = data,
            });
        }

        var session = new BugSession
        {
            ProjectId = projectId,
            StartedAt = request.StartedAt,
            EndedAt = request.EndedAt,
            InitialUrl = request.InitialUrl,
            Browser = request.Browser,
            Viewport = request.Viewport,
            CreatedAt = DateTime.UtcNow,
            Events = events,
        };

        var createdSession = await sessionService.CreateAsync(session, ct);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdSession.Id },
            new { id = createdSession.Id });
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

    private BadRequestObjectResult Invalid(string title, string detail)
        => BadRequest(new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = StatusCodes.Status400BadRequest,
        });
}