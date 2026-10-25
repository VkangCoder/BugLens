namespace BugLens.Api.Models.DTOs.Projects;

public record ProjectResponse(string Id, string Name, string KeyPrefix, DateTime CreatedAt, DateTime? KeyRotatedAt);
