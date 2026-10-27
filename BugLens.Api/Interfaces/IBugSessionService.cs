using BugLens.Api.Models;
using BugLens.Api.Models.DTOs;
using BugLens.Api.Models.DTOs.Sessions;

namespace BugLens.Api.Interfaces;

public record ProjectSessionStats(long Count, long ErrorCount, DateTime? LastStartedAt);

public interface IBugSessionService
{
    // allowedProjectIds: null = every project (admin), otherwise only these projects
    Task<PagedResponse<SessionSummaryResponse>> GetSummariesAsync(
        SessionListQuery query,
        IReadOnlyCollection<string>? allowedProjectIds,
        CancellationToken ct);
    Task<IReadOnlyDictionary<string, ProjectSessionStats>> GetProjectStatsAsync(
        IEnumerable<string> projectIds,
        CancellationToken ct);
    Task<BugSession?> GetByIdAsync(string id, CancellationToken ct);
    Task<BugSession> CreateAsync(BugSession session, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task EnsureIndexesAsync(CancellationToken ct);
}
