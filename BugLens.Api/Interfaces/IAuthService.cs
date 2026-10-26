using BugLens.Api.Models.DTOs.Auth;

namespace BugLens.Api.Interfaces;

public enum DeleteUserResult
{
    Deleted,
    NotFound,
    Self,       // admins can't delete their own account
    LastAdmin,  // at least one admin must remain
}

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct);

    Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct);

    Task<IReadOnlyList<UserResponse>> ListUsersAsync(CancellationToken ct);

    Task<DeleteUserResult> DeleteUserAsync(string id, string? currentUserId, CancellationToken ct);

    Task EnsureIndexesAsync(CancellationToken ct = default);

    Task SeedAdminAsync(CancellationToken ct = default);
}