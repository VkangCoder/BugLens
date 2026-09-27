using System.Text.Json;

namespace BugLens.Api.Models.DTOs.Sessions;

public class CreateSessionRequest
{
    public string ProjectId { get; set; } = default!;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string InitialUrl { get; set; } = default!;
    public BrowserInfo Browser { get; set; } = default!;
    public ViewportInfo Viewport { get; set; } = default!;
    public List<CreateEventRequest> Events { get; set; } = [];
}

public class CreateEventRequest
{
    public string Type { get; set; } = default!;
    public string Timestamp { get; set; } = default!;
    public string Url { get; set; } = default!;
    public JsonElement Data { get; set; }
}