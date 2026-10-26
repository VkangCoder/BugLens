using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class Project
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string IngestKeyHash { get; set; } = default!;
    public string IngestKeyPrefix { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
    public DateTime? KeyRotatedAt { get; set; }
}
