namespace BugLens.Api.Models.DTOs.Sessions;

public class SessionListQuery
{
    public const int MaxPageSize = 100;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? ProjectId { get; set; }
    public bool? HasErrors { get; set; }
    public string? Search { get; set; }
    public string? Sort { get; set; } // "newest" (default) or "oldest"
}
