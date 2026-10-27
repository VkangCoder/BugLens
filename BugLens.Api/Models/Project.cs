using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

// Ingest keys live in ingest_keys (one per member); old documents may still hold legacy key fields
[BsonIgnoreExtraElements]
public class Project
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string Name { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
}
