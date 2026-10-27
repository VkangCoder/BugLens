
using BugLens.Api.Models;

namespace BugLens.Api.Interfaces;

public interface IProjectMemberService
{
    Task EnsureIndexesAsync(CancellationToken ct = default);

    Task<bool> IsMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default);

    Task<IReadOnlyList<string>> ListProjectIdsAsync(
        string userId,
        CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, int>> CountByProjectAsync(
        IEnumerable<string> projectIds,
        CancellationToken ct = default);

    // userId -> ids of the projects they belong to
    Task<IReadOnlyDictionary<string, List<string>>> ListProjectIdsByUserAsync(CancellationToken ct = default);

    Task<IReadOnlyList<ProjectMember>> ListAsync(
        string projectId,
        CancellationToken ct = default);

    Task<bool> AddMemberAsync(
        string projectId,
        string userId,
        string addedByUserId,
        CancellationToken ct = default);

    Task<bool> RemoveMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default);

    // A deleted user: drop their memberships and revoke their keys
    Task RemoveUserAsync(string userId, CancellationToken ct = default);

    // A deleted project: drop its memberships and keys
    Task RemoveProjectAsync(string projectId, CancellationToken ct = default);

    // Startup sweep for memberships and keys whose project or user no longer exists
    Task RemoveOrphansAsync(CancellationToken ct = default);
}
