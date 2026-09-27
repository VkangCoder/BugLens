using BugLens.Api.Models;

namespace BugLens.Api.Interfaces;

public interface IBugSessionService
{
    Task<IReadOnlyList<BugSession>> GetAllAsync(CancellationToken ct);
    Task<BugSession?> GetByIdAsync(string id, CancellationToken ct);
    Task<BugSession> CreateAsync(BugSession session, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
}