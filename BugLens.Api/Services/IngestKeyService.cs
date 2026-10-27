
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Security.Cryptography;
using System.Text;

namespace BugLens.Api.Services;

public class IngestKeyService : IIngestKeyService
{
    private const string CollectionName = "ingest_keys";
    private const string KeyMarker = "bl_";
    private const int DisplayPrefixLength = 9;

    private readonly IMongoCollection<IngestKey> _keys;
    private readonly IMongoCollection<Project> _projects;
    private readonly IProjectMemberService _members;

    public IngestKeyService(
        IMongoDatabase database,
        IProjectMemberService members)
    {
        _keys = database.GetCollection<IngestKey>(CollectionName);
        _projects = database.GetCollection<Project>("projects");
        _members = members;
    }

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        var uniqueHash = new CreateIndexModel<IngestKey>(
            Builders<IngestKey>.IndexKeys.Ascending(x => x.KeyHash),
            new CreateIndexOptions
            {
                Unique = true,
                Name = "ux_ingest_keys_hash"
            });

        var ownerIndex = new CreateIndexModel<IngestKey>(
            Builders<IngestKey>.IndexKeys
                .Ascending(x => x.ProjectId)
                .Ascending(x => x.OwnerUserId),
            new CreateIndexOptions { Name = "ix_ingest_keys_project_owner" });

        await _keys.Indexes.CreateManyAsync([uniqueHash, ownerIndex], ct);
    }

    public async Task<CreatedIngestKey> CreateAsync(
        string projectId,
        string ownerUserId,
        string name,
        CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(ownerUserId, out _))
        {
            throw new ArgumentException("Invalid project or user ID.");
        }

        if (!await _members.IsMemberAsync(projectId, ownerUserId, ct))
            throw new InvalidOperationException("User is not a member of this project.");

        var projectExists = await _projects
            .Find(x => x.Id == projectId)
            .AnyAsync(ct);

        if (!projectExists)
            throw new KeyNotFoundException("Project not found.");

        var secret = GenerateKey();

        var key = new IngestKey
        {
            ProjectId = projectId,
            OwnerUserId = ownerUserId,
            Name = name.Trim(),
            KeyHash = Hash(secret),
            KeyPrefix = secret[..DisplayPrefixLength],
            CreatedAt = DateTime.UtcNow
        };

        await _keys.InsertOneAsync(key, cancellationToken: ct);

        return new CreatedIngestKey(key, secret);
    }

    public async Task<IReadOnlyList<IngestKey>> ListAsync(
        string projectId,
        string? ownerUserId,
        CancellationToken ct = default)
    {
        var filter = Builders<IngestKey>.Filter.Eq(x => x.ProjectId, projectId);

        if (ownerUserId is not null)
        {
            filter &= Builders<IngestKey>.Filter.Eq(
                x => x.OwnerUserId, ownerUserId);
        }

        return await _keys
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<bool> RevokeAsync(
        string projectId,
        string keyId,
        string? ownerUserId,
        CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(keyId, out _))
        {
            return false;
        }

        var filter = Builders<IngestKey>.Filter.And(
            Builders<IngestKey>.Filter.Eq(x => x.Id, keyId),
            Builders<IngestKey>.Filter.Eq(x => x.ProjectId, projectId),
            Builders<IngestKey>.Filter.Eq(x => x.RevokedAt, null));

        if (ownerUserId is not null)
        {
            filter &= Builders<IngestKey>.Filter.Eq(
                x => x.OwnerUserId, ownerUserId);
        }

        var update = Builders<IngestKey>.Update
            .Set(x => x.RevokedAt, DateTime.UtcNow);

        var result = await _keys.UpdateOneAsync(
            filter, update, cancellationToken: ct);

        return result.ModifiedCount > 0;
    }

    public async Task<IngestKeyAuthentication?> FindActiveByKeyAsync(
        string rawKey,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawKey) ||
            !rawKey.StartsWith(KeyMarker, StringComparison.Ordinal))
        {
            return null;
        }

        var hash = Hash(rawKey);

        var key = await _keys
            .Find(x => x.KeyHash == hash && x.RevokedAt == null)
            .FirstOrDefaultAsync(ct);

        if (key is null)
            return null;

        if (!await _members.IsMemberAsync(key.ProjectId, key.OwnerUserId, ct))
            return null;

        var project = await _projects
            .Find(x => x.Id == key.ProjectId)
            .FirstOrDefaultAsync(ct);

        if (project is null)
            return null;

        var lastUsed = DateTime.UtcNow;

        var updateResult = await _keys.UpdateOneAsync(
            x => x.Id == key.Id && x.RevokedAt == null,
            Builders<IngestKey>.Update.Set(x => x.LastUsedAt, lastUsed),
            cancellationToken: ct);

        if (updateResult.MatchedCount == 0)
            return null;

        key.LastUsedAt = lastUsed;
        return new IngestKeyAuthentication(key, project);
    }

    public async Task RevokeAllForMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default)
    {
        var filter = Builders<IngestKey>.Filter.And(
            Builders<IngestKey>.Filter.Eq(x => x.ProjectId, projectId),
            Builders<IngestKey>.Filter.Eq(x => x.OwnerUserId, userId),
            Builders<IngestKey>.Filter.Eq(x => x.RevokedAt, null));

        var update = Builders<IngestKey>.Update
            .Set(x => x.RevokedAt, DateTime.UtcNow);

        await _keys.UpdateManyAsync(filter, update, cancellationToken: ct);
    }

    private static string GenerateKey()
        => KeyMarker + Convert.ToBase64String(
                RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static string Hash(string key)
        => Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(key)));

    public async Task<IReadOnlyDictionary<string, int>> CountActiveAsync(
        string ownerUserId,
        IEnumerable<string> projectIds,
        CancellationToken ct = default)
    {
        var ids = projectIds.ToList();
        var f = Builders<IngestKey>.Filter;
        var rows = await _keys
            .Find(f.Eq(x => x.OwnerUserId, ownerUserId) & f.Eq(x => x.RevokedAt, null) & f.In(x => x.ProjectId, ids))
            .Project(x => x.ProjectId)
            .ToListAsync(ct);

        return rows.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
    }
}
