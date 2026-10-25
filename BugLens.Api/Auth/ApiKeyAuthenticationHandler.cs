using System.Security.Claims;
using System.Text.Encodings.Web;
using BugLens.Api.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace BugLens.Api.Auth;

public static class ApiKeyDefaults
{
    public const string Scheme = "ApiKey";
    public const string HeaderName = "X-Api-Key";
    public const string ProjectIdClaim = "project_id";
}

public class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IProjectService projects)
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

        var project = await projects.FindByIngestKeyAsync(key, Context.RequestAborted);
        if (project is null)
            return AuthenticateResult.Fail("Invalid API key.");

        var identity = new ClaimsIdentity(
            [new Claim(ApiKeyDefaults.ProjectIdClaim, project.Id)],
            Scheme.Name);

        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}
