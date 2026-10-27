
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BugLens.Api.Services;

public class ProjectMemberService : IProjectMemberService
{
    private readonly IMongoCollection<ProjectMember> _members;
    private readonly IMongoCollection<IngestKey> _keys;
    private readonly IMongoCollection<Project> _projects;
    private readonly IMongoCollection<AppUser> _users;

    public ProjectMemberService(IMongoDatabase database)
    {
        _members = database.GetCollection<ProjectMember>("project_members");
        _keys = database.GetCollection<IngestKey>("ingest_keys");
        _projects = database.GetCollection<Project>("projects");
        _users = database.GetCollection<AppUser>("users");
    }

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        var index = new CreateIndexModel<ProjectMember>(
            Builders<ProjectMember>.IndexKeys
                .Ascending(x => x.ProjectId)
                .Ascending(x => x.UserId),
            new CreateIndexOptions
            {
                Unique = true,
                Name = "ux_project_members_project_user"
            });

        await _members.Indexes.CreateOneAsync(index, cancellationToken: ct);
    }

    public async Task<bool> IsMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default)
    {
        return await _members
            .Find(x => x.ProjectId == projectId && x.UserId == userId)
            .AnyAsync(ct);
    }

    public async Task<IReadOnlyList<string>> ListProjectIdsAsync(
        string userId,
        CancellationToken ct = default)
    {
        return await _members
            .Find(x => x.UserId == userId)
            .Project(x => x.ProjectId)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProjectMember>> ListAsync(
        string projectId,
        CancellationToken ct = default)
    {
        return await _members
            .Find(x => x.ProjectId == projectId)
            .SortBy(x => x.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<bool> AddMemberAsync(
        string projectId,
        string userId,
        string addedByUserId,
        CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(userId, out _) ||
            !ObjectId.TryParse(addedByUserId, out _))
        {
            return false;
        }

        if (await IsMemberAsync(projectId, userId, ct))
            return false;

        try
        {
            await _members.InsertOneAsync(
                new ProjectMember
                {
                    ProjectId = projectId,
                    UserId = userId,
                    AddedByUserId = addedByUserId,
                    CreatedAt = DateTime.UtcNow
                },
                cancellationToken: ct);

            return true;
        }
        catch (MongoWriteException ex)
            when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

    public async Task<bool> RemoveMemberAsync(
        string projectId,
        string userId,
        CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(projectId, out _) ||
            !ObjectId.TryParse(userId, out _))
        {
            return false;
        }

        var result = await _members.DeleteOneAsync(
            x => x.ProjectId == projectId && x.UserId == userId,
            ct);

        if (result.DeletedCount == 0)
            return false;

        var filter = Builders<IngestKey>.Filter.And(
            Builders<IngestKey>.Filter.Eq(x => x.ProjectId, projectId),
            Builders<IngestKey>.Filter.Eq(x => x.OwnerUserId, userId),
            Builders<IngestKey>.Filter.Eq(x => x.RevokedAt, null));

        var update = Builders<IngestKey>.Update
            .Set(x => x.RevokedAt, DateTime.UtcNow);

        await _keys.UpdateManyAsync(filter, update, cancellationToken: ct);

        return true;
    }

    public async Task RemoveUserAsync(string userId, CancellationToken ct = default)
    {
        await _members.DeleteManyAsync(x => x.UserId == userId, ct);

        await _keys.UpdateManyAsync(
            x => x.OwnerUserId == userId && x.RevokedAt == null,
            Builders<IngestKey>.Update.Set(x => x.RevokedAt, DateTime.UtcNow),
            cancellationToken: ct);
    }

    public async Task RemoveProjectAsync(string projectId, CancellationToken ct = default)
    {
        await _members.DeleteManyAsync(x => x.ProjectId == projectId, ct);
        await _keys.DeleteManyAsync(x => x.ProjectId == projectId, ct);
    }

    public async Task RemoveOrphansAsync(CancellationToken ct = default)
    {
        var projectIds = await _projects.Find(FilterDefinition<Project>.Empty).Project(p => p.Id).ToListAsync(ct);
        var userIds = await _users.Find(FilterDefinition<AppUser>.Empty).Project(u => u.Id).ToListAsync(ct);

        var m = Builders<ProjectMember>.Filter;
        await _members.DeleteManyAsync(
            m.Or(m.Nin(x => x.ProjectId, projectIds), m.Nin(x => x.UserId, userIds)),
            ct);

        var k = Builders<IngestKey>.Filter;
        await _keys.DeleteManyAsync(k.Nin(x => x.ProjectId, projectIds), ct);
        await _keys.UpdateManyAsync(
            k.And(k.Nin(x => x.OwnerUserId, userIds), k.Eq(x => x.RevokedAt, null)),
            Builders<IngestKey>.Update.Set(x => x.RevokedAt, DateTime.UtcNow),
            cancellationToken: ct);
    }

    public async Task<IReadOnlyDictionary<string, int>> CountByProjectAsync(
        IEnumerable<string> projectIds,
        CancellationToken ct = default)
    {
        var ids = projectIds.ToList();
        var rows = await _members
            .Find(Builders<ProjectMember>.Filter.In(x => x.ProjectId, ids))
            .Project(x => x.ProjectId)
            .ToListAsync(ct);

        return rows.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
    }

    public async Task<IReadOnlyDictionary<string, List<string>>> ListProjectIdsByUserAsync(CancellationToken ct = default)
    {
        var rows = await _members
            .Find(FilterDefinition<ProjectMember>.Empty)
            .Project(x => new { x.UserId, x.ProjectId })
            .ToListAsync(ct);

        return rows.GroupBy(x => x.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.ProjectId).ToList());
    }
}
