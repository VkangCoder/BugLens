
using BugLens.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugLens.Api.Controllers;

[ApiController]
[Route("api/v1/ingest")]
public class IngestController : ControllerBase
{
    [HttpPost("validate-key")]
    [Authorize(AuthenticationSchemes = ApiKeyDefaults.Scheme)]
    public IActionResult ValidateKey()
    {

        Response.Headers.CacheControl = "no-store";

        // Lets the extension show which project its sessions are filed under
        return Ok(new
        {
            valid = true,
            projectId = User.FindFirst(ApiKeyDefaults.ProjectIdClaim)?.Value,
            projectName = User.FindFirst(ApiKeyDefaults.ProjectNameClaim)?.Value,
        });
    }
}
