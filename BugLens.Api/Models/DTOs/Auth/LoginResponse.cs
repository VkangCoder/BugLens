namespace BugLens.Api.Models.DTOs.Auth;

public record LoginResponse(string Token, DateTime ExpireAt, string Name, string Role);
