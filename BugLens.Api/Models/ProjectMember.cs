using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class ProjectMember
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string ProjectId { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string AddedByUserId { get; set; } = default!;

    public DateTime CreatedAt { get; set; }
}
