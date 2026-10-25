using BugLens.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace BugLens.Api.OpenApi;

/// <summary>
/// Describes how to call the API in the OpenAPI document, so Scalar can send the credentials:
/// - "Bearer": JWT from POST /api/v1/auth/login (dashboard endpoints)
/// - "ApiKey": X-Api-Key header with a project ingest key (POST /api/v1/sessions)
/// Each operation gets the scheme its [Authorize] / [AllowAnonymous] attributes ask for.
/// </summary>
public sealed class SecuritySchemeTransformer : IOpenApiDocumentTransformer, IOpenApiOperationTransformer
{
    public const string BearerScheme = "Bearer";

    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken ct)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

        document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Token from POST /api/v1/auth/login.",
        };

        document.Components.SecuritySchemes[ApiKeyDefaults.Scheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            In = ParameterLocation.Header,
            Name = ApiKeyDefaults.HeaderName,
            Description = "Project ingest key (bl_...) from POST /api/v1/projects. Used by the extension.",
        };

        return Task.CompletedTask;
    }

    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken ct)
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;

        if (metadata.OfType<IAllowAnonymous>().Any())
            return Task.CompletedTask; // e.g. POST /auth/login

        // [Authorize(AuthenticationSchemes = "ApiKey")] → API key; anything else (incl. the fallback policy) → JWT
        var usesApiKey = metadata.OfType<IAuthorizeData>()
            .Any(a => a.AuthenticationSchemes?.Split(',').Select(s => s.Trim()).Contains(ApiKeyDefaults.Scheme) == true);

        var scheme = usesApiKey ? ApiKeyDefaults.Scheme : BearerScheme;

        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(scheme, context.Document)] = [],
        });

        return Task.CompletedTask;
    }
}
