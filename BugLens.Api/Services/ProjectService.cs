using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace BugLens.Api.Services;

public class ProjectService : IProjectService
{
    private const string CollectionName = "projects";
    private const string KeyMarker = "bl_";
    private const int DisplayPrefixLength = 9;

    private readonly IMongoCollection<Project> _projects;

    public ProjectService(IMongoDatabase database)
        => _projects = database.GetCollection<Project>(CollectionName);

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        var model = new CreateIndexModel<Project>(
            Builders<Project>.IndexKeys.Ascending(p => p.IngestKeyHash),
            new CreateIndexOptions { Unique = true, Name = "ux_projects_key_hash" });

        await _projects.Indexes.CreateOneAsync(model, cancellationToken: ct);
    }

    public async Task<ProjectWithKeyResponse> CreateAsync(string name, CancellationToken ct)
    {
        var key = GenerateKey();
        var project = new Project
        {
            Name = name.Trim(),
            IngestKeyHash = Hash(key),
            IngestKeyPrefix = key[..DisplayPrefixLength],
            CreatedAt = DateTime.UtcNow,
        };

        await _projects.InsertOneAsync(project, cancellationToken: ct);
        return ToWithKey(project, key);
    }

    public async Task<IReadOnlyList<ProjectResponse>> ListAsync(CancellationToken ct)
    {
        var projects = await _projects.Find(_ => true).SortBy(p => p.Name).ToListAsync(ct);
        return projects
            .Select(p => new ProjectResponse(p.Id, p.Name, p.IngestKeyPrefix, p.CreatedAt, p.KeyRotatedAt))
            .ToList();
    }

    public async Task<ProjectWithKeyResponse?> RotateKeyAsync(string id, CancellationToken ct)
    {
        if (!ObjectId.TryParse(id, out _)) return null; // avoid FormatException → 500

        var key = GenerateKey();
        var update = Builders<Project>.Update
            .Set(p => p.IngestKeyHash, Hash(key))
            .Set(p => p.IngestKeyPrefix, key[..DisplayPrefixLength])
            .Set(p => p.KeyRotatedAt, DateTime.UtcNow);

        var project = await _projects.FindOneAndUpdateAsync(
            p => p.Id == id,
            update,
            new FindOneAndUpdateOptions<Project> { ReturnDocument = ReturnDocument.After },
            ct);

        return project is null ? null : ToWithKey(project, key);
    }

    public async Task<Project?> FindByIngestKeyAsync(string key, CancellationToken ct)
    {
        if (!key.StartsWith(KeyMarker, StringComparison.Ordinal)) return null;

        var hash = Hash(key);
        return await _projects.Find(p => p.IngestKeyHash == hash).FirstOrDefaultAsync(ct);
    }

    // Removes the project and its key; the extension gets 401 right away. Sessions are kept.
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

    private static string GenerateKey()
        => KeyMarker + Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32)); // 256 bit

    private static string Hash(string key)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));

    private static ProjectWithKeyResponse ToWithKey(Project p, string key)
        => new(p.Id, p.Name, p.IngestKeyPrefix, p.CreatedAt, p.KeyRotatedAt, key);
}