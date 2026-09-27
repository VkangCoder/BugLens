using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using MongoDB.Driver;

namespace BugLens.Api.Services;

public class BugSessionService : IBugSessionService
{
    private readonly IMongoCollection<BugSession> _sessions;

    public BugSessionService(IMongoDatabase database)
    {
        _sessions = database.GetCollection<BugSession>("bug_sessions");
    }

    public async Task<IReadOnlyList<BugSession>> GetAllAsync(CancellationToken ct)
    {
        return await _sessions.Find(_ => true).ToListAsync(ct);
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
}