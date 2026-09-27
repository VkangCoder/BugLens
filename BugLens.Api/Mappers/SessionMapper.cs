using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Sessions;
using MongoDB.Bson;
using System.Text.Json;

namespace BugLens.Api.Mappers;

public static class SessionMapper
{
    public static SessionResponse ToResponse(BugSession session)
    {
        return new SessionResponse
        {
            Id = session.Id,
            ProjectId = session.ProjectId,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,
            InitialUrl = session.InitialUrl,
            Browser = session.Browser,
            Viewport = session.Viewport,
            CreatedAt = session.CreatedAt,
            Events = session.Events.Select(ToEventResponse).ToList()
        };
    }

    private static EventResponse ToEventResponse(BugEvent e)
    {
        using var document = JsonDocument.Parse(e.Data.ToJson());

        return new EventResponse
        {
            Type = e.Type,
            Timestamp = e.Timestamp,
            Url = e.Url,
            Data = document.RootElement.Clone()
        };
    }
}