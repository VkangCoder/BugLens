using BugLens.Api.Models.DTOs.Auth;

namespace BugLens.Api.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct);

    Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct);

    Task EnsureIndexesAsync(CancellationToken ct = default);

    Task SeedAdminAsync(CancellationToken ct = default);
}