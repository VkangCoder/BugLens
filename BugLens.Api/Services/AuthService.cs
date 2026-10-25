using BugLens.Api.Data;
using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.Text;

namespace BugLens.Api.Services;

public class AuthService : IAuthService
{
    private const string UsersCollectionName = "users";
    private const int BcryptWorkFactor = 12;

    private static readonly Collation NameCollation =
        new("en", strength: CollationStrength.Secondary);

    private static readonly string DummyHash =
        BCrypt.Net.BCrypt.HashPassword("dummy-password-for-timing", BcryptWorkFactor);

    private readonly IMongoCollection<AppUser> _users;
    private readonly JwtSettings _jwt;
    private readonly SeedAdminSettings _seed;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IMongoDatabase database,
        IOptions<JwtSettings> jwt,
        IOptions<SeedAdminSettings> seed,
        ILogger<AuthService> logger)
    {
        _users = database.GetCollection<AppUser>(UsersCollectionName);
        _jwt = jwt.Value;
        _seed = seed.Value;
        _logger = logger;
    }

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        var model = new CreateIndexModel<AppUser>(
            Builders<AppUser>.IndexKeys.Ascending(u => u.Name),
            new CreateIndexOptions
            {
                Unique = true,
                Name = "ux_users_name",
                Collation = NameCollation,
            });

        await _users.Indexes.CreateOneAsync(model, cancellationToken: ct);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
    {
        if (!Roles.All.Contains(request.Role))
            throw new ArgumentException($"Role must be one of: {string.Join(", ", Roles.All)}.", nameof(request));

        var user = new AppUser
        {
            Name = request.Name.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, BcryptWorkFactor),
            Role = request.Role,
            CreatedAt = DateTime.UtcNow,
        };

        try
        {
            await _users.InsertOneAsync(user, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new InvalidOperationException($"User '{user.Name}' already exists.");
        }

        return new UserResponse(user.Id, user.Name, user.Role, user.CreatedAt);
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var name = request.Name.Trim();

        var user = await _users
            .Find(u => u.Name == name, new FindOptions { Collation = NameCollation })
            .FirstOrDefaultAsync(ct);

        var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, user?.PasswordHash ?? DummyHash);

        if (user is null || !passwordOk)
            return null;

        var expiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        return new LoginResponse(IssueToken(user, expiresAt), expiresAt, user.Name, user.Role);
    }

    public async Task SeedAdminAsync(CancellationToken ct = default)
    {
        var hasAdmin = await _users.CountDocumentsAsync(
            u => u.Role == Roles.Admin,
            new CountOptions { Limit = 1 },
            ct) > 0;

        if (hasAdmin) return;

        if (string.IsNullOrWhiteSpace(_seed.Name) || string.IsNullOrEmpty(_seed.Password) || _seed.Password.Length < 6)
            throw new InvalidOperationException(
                "No admin exists. Set SeedAdmin:Name and SeedAdmin:Password (>= 6 chars) via appsettings / user-secrets.");

        try
        {
            await CreateUserAsync(
                new CreateUserRequest { Name = _seed.Name, Password = _seed.Password, Role = Roles.Admin }, ct);
            _logger.LogInformation("Seeded initial admin '{Name}'.", _seed.Name);
        }
        catch (InvalidOperationException)
        {
            _logger.LogInformation("Admin '{Name}' already seeded by another instance.", _seed.Name);
        }
    }

    private string IssueToken(AppUser user, DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                ["sub"] = user.Id,
                ["name"] = user.Name,
                ["role"] = user.Role,
            },
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}