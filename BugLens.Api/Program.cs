using BugLens.Api.Auth;
using BugLens.Api.Data;
using BugLens.Api.Interfaces;
using BugLens.Api.OpenApi;
using BugLens.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using Scalar.AspNetCore;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(settings.ConnectionString);
});

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(settings.DatabaseName);
});

builder.Services.AddScoped<IBugSessionService, BugSessionService>();

// Configure JwtSettings for authentication, ensuring that essential values ​​are provided and valid.
builder.Services
    .AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection(JwtSettings.SectionName))
    .Validate(
        s => !string.IsNullOrWhiteSpace(s.Secret) && Encoding.UTF8.GetByteCount(s.Secret) >= 32,
        "JwtSettings:Secret must be at least 32 bytes.")
    .Validate(
        s => !string.IsNullOrWhiteSpace(s.Issuer) && !string.IsNullOrWhiteSpace(s.Audience),
        "JwtSettings:Issuer and Audience are required.")
    .ValidateOnStart();

// Two ways in: JWT for people (dashboard), X-Api-Key for the extension (ingest only)
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer()
    .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(ApiKeyDefaults.Scheme, null);

// Deny by default: an endpoint without [Authorize] / [AllowAnonymous] still needs a signed-in user
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtSettings>>((options, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;

        options.MapInboundClaims = false; // keep "sub", "name", and "role" as they appear in the token

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
    });

builder.Services.Configure<SeedAdminSettings>(builder.Configuration.GetSection(SeedAdminSettings.SectionName));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProjectService, ProjectService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowExtension", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddControllers();
// Bearer + ApiKey security schemes, so Scalar can send the token / key on every request
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<SecuritySchemeTransformer>();
    options.AddOperationTransformer<SecuritySchemeTransformer>();
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var sp = scope.ServiceProvider;

    try
    {
        await sp.GetRequiredService<IBugSessionService>().EnsureIndexesAsync(CancellationToken.None);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not create session indexes. The API still runs, but list queries may be slower.");
    }

    var auth = sp.GetRequiredService<IAuthService>();
    await auth.EnsureIndexesAsync();
    await auth.SeedAdminAsync();

    // Unique index on the key hash: fail fast if it cannot be created
    await sp.GetRequiredService<IProjectService>().EnsureIndexesAsync();
}

if (app.Environment.IsDevelopment())
{
    // The fallback policy would also lock the API docs
    app.MapOpenApi().AllowAnonymous();
    // Paste the JWT once in Scalar (Auth → Bearer); it is kept across requests and page reloads
    app.MapScalarApiReference(options => options
            .AddPreferredSecuritySchemes(SecuritySchemeTransformer.BearerScheme)
            .EnablePersistentAuthentication())
        .AllowAnonymous();
}

// CORS first, so every response (redirects and errors too) carries the CORS headers
app.UseCors("AllowExtension");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();