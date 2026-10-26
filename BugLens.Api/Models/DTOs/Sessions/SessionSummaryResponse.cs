namespace BugLens.Api.Models.DTOs.Sessions;

public class SessionSummaryResponse
{
    public string Id { get; set; } = default!;
    public string ProjectId { get; set; } = default!;
    public string? ProjectName { get; set; } // null when the project was deleted
    public string InitialUrl { get; set; } = default!;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public BrowserInfo Browser { get; set; } = default!;
    public ViewportInfo Viewport { get; set; } = default!;
    public int EventCount { get; set; }
    public int ErrorCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
