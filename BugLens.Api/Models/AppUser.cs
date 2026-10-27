using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BugLens.Api.Models;

public class AppUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public int Team { get; set; }
    public string Role { get; set; } = Roles.Dev;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
