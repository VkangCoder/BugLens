using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class Project
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string IngestKeyHash { get; set; } = default!;   // SHA-256 hex, the raw key is never stored
    public string IngestKeyPrefix { get; set; } = default!; // "bl_x9f3aB", only to recognise the key in the UI
    public DateTime CreatedAt { get; set; }
    public DateTime? KeyRotatedAt { get; set; }
}
