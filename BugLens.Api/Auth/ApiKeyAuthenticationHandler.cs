
using BugLens.Api.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace BugLens.Api.Auth;

public static class ApiKeyDefaults
{
    public const string Scheme = "ApiKey";
    public const string HeaderName = "X-Api-Key";

    public const string ProjectIdClaim = "project_id";
    public const string ProjectNameClaim = "project_name";
    public const string IngestKeyIdClaim = "ingest_key_id";
    public const string IngestKeyOwnerIdClaim = "ingest_key_owner_id";
}

public class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IIngestKeyService ingestKeys)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    private const int MaxKeyLength = 128;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyDefaults.HeaderName, out var values))
            return AuthenticateResult.NoResult();

        var key = values.ToString().Trim();

        if (key.Length == 0 || key.Length > MaxKeyLength)
            return AuthenticateResult.Fail("Invalid API key.");

        var result = await ingestKeys.FindActiveByKeyAsync(
            key,
            Context.RequestAborted);

        if (result is null)
            return AuthenticateResult.Fail("Invalid API key.");

        var identity = new ClaimsIdentity(
            [
                new Claim(ApiKeyDefaults.ProjectIdClaim, result.Project.Id),
                new Claim(ApiKeyDefaults.ProjectNameClaim, result.Project.Name),
                new Claim(ApiKeyDefaults.IngestKeyIdClaim, result.Key.Id),
                new Claim(ApiKeyDefaults.IngestKeyOwnerIdClaim, result.Key.OwnerUserId),
            ],
            Scheme.Name);

        return AuthenticateResult.Success(
            new AuthenticationTicket(
                new ClaimsPrincipal(identity),
                Scheme.Name));
    }
}
