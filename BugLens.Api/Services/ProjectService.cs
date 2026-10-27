using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BugLens.Api.Services;

public class ProjectService : IProjectService
{
    private const string CollectionName = "projects";
    private const string LegacyKeyIndex = "ux_projects_key_hash";

    private readonly IMongoCollection<Project> _projects;

    public ProjectService(IMongoDatabase database)
        => _projects = database.GetCollection<Project>(CollectionName);

    // Removes the old per-project key: its unique index (new projects have no hash, so a second one
    // would collide on null) and the stored hashes. Safe to run on every startup.
    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        using var cursor = await _projects.Indexes.ListAsync(ct);
        var indexes = await cursor.ToListAsync(ct);
        if (indexes.Any(i => i["name"].AsString == LegacyKeyIndex))
            await _projects.Indexes.DropOneAsync(LegacyKeyIndex, ct);

        var legacyFields = Builders<Project>.Filter.Exists("IngestKeyHash");
        var unset = Builders<Project>.Update
            .Unset("IngestKeyHash")
            .Unset("IngestKeyPrefix")
            .Unset("KeyRotatedAt");
        await _projects.UpdateManyAsync(legacyFields, unset, cancellationToken: ct);
    }

    public async Task<ProjectResponse> CreateAsync(string name, CancellationToken ct)
    {
        var project = new Project
        {
            Name = name.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        await _projects.InsertOneAsync(project, cancellationToken: ct);
        return ToResponse(project);
    }

    // ids: null = every project (admin), otherwise only these
    public async Task<IReadOnlyList<ProjectResponse>> ListAsync(IReadOnlyCollection<string>? ids, CancellationToken ct)
    {
        var filter = ids is null
            ? Builders<Project>.Filter.Empty
            : Builders<Project>.Filter.In(p => p.Id, ids.Where(id => ObjectId.TryParse(id, out _)));

        var projects = await _projects.Find(filter).SortBy(p => p.Name).ToListAsync(ct);
        return projects.Select(ToResponse).ToList();
    }

    // Keys stop working right away (key lookup requires the project). Sessions are kept.
    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out _)) return false;

        var result = await _projects.DeleteOneAsync(p => p.Id == id, ct);
        return result.DeletedCount > 0;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetNamesAsync(IEnumerable<string> ids, CancellationToken ct)
    {
        var valid = ids.Distinct().Where(id => ObjectId.TryParse(id, out _)).ToList();
        if (valid.Count == 0) return new Dictionary<string, string>();

        var projects = await _projects
            .Find(Builders<Project>.Filter.In(p => p.Id, valid))
            .Project(p => new { p.Id, p.Name })
            .ToListAsync(ct);

        return projects.ToDictionary(p => p.Id, p => p.Name);
    }

    private static ProjectResponse ToResponse(Project p) => new(p.Id, p.Name, p.CreatedAt);
}
