namespace BugLens.Api.Models.DTOs.Auth;

public record LoginResponse(string Token, DateTime ExpiresAt, string Name, string Role);