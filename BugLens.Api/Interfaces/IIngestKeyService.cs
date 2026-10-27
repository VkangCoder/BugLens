
using BugLens.Api.Models;

namespace BugLens.Api.Interfaces;

public sealed record IngestKeyAuthentication(
    IngestKey Key,
    Project Project);

public sealed record CreatedIngestKey(
    IngestKey Key,
    string Secret);

public interface IIngestKeyService
{
    Task EnsureIndexesAsync(CancellationToken ct = default);

    Task<IngestKeyAuthentication?> FindActiveByKeyAsync(
        string rawKey,
        CancellationToken ct = default);

    Task<CreatedIngestKey> CreateAsync(
        string projectId,
        string ownerUserId,
        string name,
        CancellationToken ct = default);

    Task<IReadOnlyList<IngestKey>> ListAsync(
        string projectId,
        string? ownerUserId,
        CancellationToken ct = default);

    // projectId -> number of keys this owner can still use
    Task<IReadOnlyDictionary<string, int>> CountActiveAsync(
        string ownerUserId,
        IEnumerable<string> projectIds,
        CancellationToken ct = default);

    Task<bool> RevokeAsync(
        string projectId,
        string keyId,
        string? ownerUserId,
        CancellationToken ct = default);

    Task RevokeAllForMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default);
}
