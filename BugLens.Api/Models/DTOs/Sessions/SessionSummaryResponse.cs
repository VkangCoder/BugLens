namespace BugLens.Api.Models.DTOs.Sessions;

// One row of the session list. Full events are only returned by GET /sessions/{id}.
public class SessionSummaryResponse
{
    public string Id { get; set; } = default!;
    public string ProjectId { get; set; } = default!;
    public string InitialUrl { get; set; } = default!;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public BrowserInfo Browser { get; set; } = default!;
    public ViewportInfo Viewport { get; set; } = default!;
    public int EventCount { get; set; }
    public int ErrorCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
