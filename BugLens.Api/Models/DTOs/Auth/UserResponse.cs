namespace BugLens.Api.Models.DTOs.Auth;

public record UserResponse(string Id, string Name, string Role, DateTime CreatedAt);