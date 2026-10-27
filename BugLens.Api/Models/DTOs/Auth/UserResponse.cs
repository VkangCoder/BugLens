namespace BugLens.Api.Models.DTOs.Auth;

public record UserResponse(
    string Id,
    string Name,
    string Role,
    DateTime CreatedAt,
    DateTime? LastLoginAt = null,
    IReadOnlyList<UserProjectResponse>? Projects = null);

public record UserProjectResponse(string Id, string Name);
