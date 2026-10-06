namespace BugLens.Api.Models.DTOs;

public class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalCount { get; set; }
}
