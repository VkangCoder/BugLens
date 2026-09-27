using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class BugSession
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string ProjectId { get; set; } = default!;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string InitialUrl { get; set; } = default!;
    public BrowserInfo Browser { get; set; } = default!;
    public ViewportInfo Viewport { get; set; } = default!;
    public List<BugEvent> Events { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class BugEvent
{
    public string Type { get; set; } = default!;
    public string Timestamp { get; set; } = default!;
    public string Url { get; set; } = default!;
    public BsonDocument Data { get; set; } = new();
}

public class BrowserInfo
{
    public string Name { get; set; } = default!;
    public string Version { get; set; } = default!;
}

public class ViewportInfo
{
    public int Width { get; set; }
    public int Height { get; set; }
}