namespace BugLens.Api.Models.DTOs.Projects;

/// <summary>Returned exactly once, when the project is created or its key is rotated.</summary>
public record ProjectWithKeyResponse(
    string Id, string Name, string KeyPrefix, DateTime CreatedAt, DateTime? KeyRotatedAt, string IngestKey);
