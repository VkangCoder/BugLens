using BugLens.Api.Models;
using BugLens.Api.Models.DTOs;
using BugLens.Api.Models.DTOs.Sessions;

namespace BugLens.Api.Interfaces;

public interface IBugSessionService
{
    Task<PagedResponse<SessionSummaryResponse>> GetSummariesAsync(SessionListQuery query, CancellationToken ct);
    Task<BugSession?> GetByIdAsync(string id, CancellationToken ct);
    Task<BugSession> CreateAsync(BugSession session, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task EnsureIndexesAsync(CancellationToken ct);
}
