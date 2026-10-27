using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs;
using BugLens.Api.Models.DTOs.Sessions;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Text.RegularExpressions;

namespace BugLens.Api.Services;

public class BugSessionService : IBugSessionService
{
    private const string ErrorEventType = "error";

    private readonly IMongoCollection<BugSession> _sessions;

    public BugSessionService(IMongoDatabase database)
    {
        _sessions = database.GetCollection<BugSession>("bug_sessions");
    }

    public async Task<PagedResponse<SessionSummaryResponse>> GetSummariesAsync(
        SessionListQuery query,
        IReadOnlyCollection<string>? allowedProjectIds,
        CancellationToken ct)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, SessionListQuery.MaxPageSize);

        var filter = BuildFilter(query, allowedProjectIds);

        var totalCount = await _sessions.CountDocumentsAsync(filter, cancellationToken: ct);

        var sort = string.Equals(query.Sort, "oldest", StringComparison.OrdinalIgnoreCase)
            ? Builders<BugSession>.Sort.Ascending(s => s.StartedAt)
            : Builders<BugSession>.Sort.Descending(s => s.StartedAt);

        // Counts are computed in MongoDB, so the events array is never sent to the API
        var items = await _sessions
            .Find(filter)
            .Sort(sort)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .Project(s => new SessionSummaryResponse
            {
                Id = s.Id,
                ProjectId = s.ProjectId,
                InitialUrl = s.InitialUrl,
                StartedAt = s.StartedAt,
                EndedAt = s.EndedAt,
                Browser = s.Browser,
                Viewport = s.Viewport,
                EventCount = s.Events.Count,
                ErrorCount = s.Events.Count(e => e.Type == ErrorEventType),
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync(ct);

        return new PagedResponse<SessionSummaryResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
        };
    }

    // Only three small fields per session leave MongoDB; the events array stays on the server
    public async Task<IReadOnlyDictionary<string, ProjectSessionStats>> GetProjectStatsAsync(
        IEnumerable<string> projectIds,
        CancellationToken ct)
    {
        var ids = projectIds.ToList();
        var rows = await _sessions
            .Find(Builders<BugSession>.Filter.In(s => s.ProjectId, ids))
            .Project(s => new
            {
                s.ProjectId,
                s.StartedAt,
                Errors = s.Events.Count(e => e.Type == ErrorEventType),
            })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => r.ProjectId)
            .ToDictionary(
                g => g.Key,
                g => new ProjectSessionStats(
                    g.LongCount(),
                    g.LongCount(r => r.Errors > 0),
                    g.Max(r => (DateTime?)r.StartedAt)));
    }

    public async Task<BugSession?> GetByIdAsync(string id, CancellationToken ct)
    {
        return await _sessions.Find(s => s.Id == id).FirstOrDefaultAsync(ct);
    }

    public async Task<BugSession> CreateAsync(BugSession session, CancellationToken ct)
    {
        await _sessions.InsertOneAsync(session, cancellationToken: ct);
        return session;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var result = await _sessions.DeleteOneAsync(s => s.Id == id, ct);
        return result.DeletedCount > 0;
    }

    // Safe to run on every startup: MongoDB skips indexes that already exist
    public async Task EnsureIndexesAsync(CancellationToken ct)
    {
        var keys = Builders<BugSession>.IndexKeys;

        await _sessions.Indexes.CreateManyAsync(
            [
                // List page: newest first, optionally within one project
                new CreateIndexModel<BugSession>(
                    keys.Ascending(s => s.ProjectId).Descending(s => s.StartedAt),
                    new CreateIndexOptions { Name = "projectId_startedAt" }),
                new CreateIndexModel<BugSession>(
                    keys.Descending(s => s.StartedAt),
                    new CreateIndexOptions { Name = "startedAt" }),
                // hasErrors filter
                new CreateIndexModel<BugSession>(
                    keys.Ascending("Events.Type"),
                    new CreateIndexOptions { Name = "events_type" }),
            ],
            ct);
    }

    private static FilterDefinition<BugSession> BuildFilter(
        SessionListQuery query,
        IReadOnlyCollection<string>? allowedProjectIds)
    {
        var f = Builders<BugSession>.Filter;
        var filter = f.Empty;

        // Non-admins only see projects they belong to; an empty list matches nothing
        if (allowedProjectIds is not null)
            filter &= f.In(s => s.ProjectId, allowedProjectIds);

        if (!string.IsNullOrWhiteSpace(query.ProjectId))
            filter &= f.Eq(s => s.ProjectId, query.ProjectId);

        if (query.HasErrors is bool hasErrors)
        {
            var hasErrorEvent = f.ElemMatch(s => s.Events, e => e.Type == ErrorEventType);
            filter &= hasErrors ? hasErrorEvent : f.Not(hasErrorEvent);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            var urlContains = f.Regex(s => s.InitialUrl, new BsonRegularExpression(Regex.Escape(term), "i"));
            filter &= ObjectId.TryParse(term, out _)
                ? f.Or(urlContains, f.Eq(s => s.Id, term))
                : urlContains;
        }

        return filter;
    }
}
