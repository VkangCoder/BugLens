
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class IngestKey
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string ProjectId { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerUserId { get; set; } = default!;

    public string Name { get; set; } = default!;

    public string KeyHash { get; set; } = default!;

    public string KeyPrefix { get; set; } = default!;

    public DateTime CreatedAt { get; set; }

    public DateTime? LastUsedAt { get; set; }

    public DateTime? RevokedAt { get; set; }
}
