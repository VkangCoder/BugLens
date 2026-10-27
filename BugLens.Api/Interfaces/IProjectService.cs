using BugLens.Api.Models.DTOs.Projects;

namespace BugLens.Api.Interfaces;

public interface IProjectService
{
    Task EnsureIndexesAsync(CancellationToken ct = default);
    Task<ProjectResponse> CreateAsync(string name, CancellationToken ct);
    Task<IReadOnlyList<ProjectResponse>> ListAsync(IReadOnlyCollection<string>? ids, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<IReadOnlyDictionary<string, string>> GetNamesAsync(IEnumerable<string> ids, CancellationToken ct);
}
