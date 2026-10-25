using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Projects;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BugLens.Api.Services;

public class ProjectService : IProjectService
{
    private const string CollectionName = "projects";
    private const string KeyMarker = "bl_";
    private const int DisplayPrefixLength = 9; // "bl_" + first 6 characters

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
        if (!key.StartsWith(KeyMarker, StringComparison.Ordinal)) return null; // reject junk before touching the DB

        var hash = Hash(key);
        return await _projects.Find(p => p.IngestKeyHash == hash).FirstOrDefaultAsync(ct);
    }

    private static string GenerateKey()
        => KeyMarker + Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32)); // 256 bit

    private static string Hash(string key)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));

    private static ProjectWithKeyResponse ToWithKey(Project p, string key)
        => new(p.Id, p.Name, p.IngestKeyPrefix, p.CreatedAt, p.KeyRotatedAt, key);
}
