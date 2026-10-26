using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;

namespace BugLens.Api.Interfaces;

public interface IProjectService
{
    Task EnsureIndexesAsync(CancellationToken ct = default);
    Task<ProjectWithKeyResponse> CreateAsync(string name, CancellationToken ct);
    Task<IReadOnlyList<ProjectResponse>> ListAsync(CancellationToken ct);
    Task<ProjectWithKeyResponse?> RotateKeyAsync(string id, CancellationToken ct);
    Task<Project?> FindByIngestKeyAsync(string key, CancellationToken ct);
    Task<bool> DeleteAsync(string id, CancellationToken ct);
    Task<IReadOnlyDictionary<string, string>> GetNamesAsync(IEnumerable<string> ids, CancellationToken ct);
}