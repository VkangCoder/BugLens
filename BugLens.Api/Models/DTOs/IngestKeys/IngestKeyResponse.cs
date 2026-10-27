
namespace BugLens.Api.Models.DTOs.IngestKeys;

public sealed record IngestKeyResponse(
    string Id,
    string ProjectId,
    string OwnerUserId,
    string Name,
    string KeyPrefix,
    DateTime CreatedAt,
    DateTime? LastUsedAt,
    DateTime? RevokedAt);

public sealed record CreatedIngestKeyResponse(
    string Id,
    string ProjectId,
    string OwnerUserId,
    string Name,
    string KeyPrefix,
    DateTime CreatedAt,
    string Secret);
