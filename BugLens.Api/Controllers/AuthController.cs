using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace BugLens.Api.Controllers
{
    [Route("api/v1/auth")]
    [ApiController]
    public class AuthController(IAuthService authService) : ControllerBase
    {

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
        {
            var result = await authService.LoginAsync(request, ct);

            return result is null
                ? Unauthorized(new ProblemDetails { Title = "Invalid credentials", Status = StatusCodes.Status401Unauthorized })
                : Ok(result);
        }


        // POST api/<AuthController>
        [HttpPost("users")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<ActionResult<UserResponse>> CreateUser(CreateUserRequest request, CancellationToken ct)
        {
            try
            {
                var user = await authService.CreateUserAsync(request, ct);
                return StatusCode(StatusCodes.Status201Created, user);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new ProblemDetails { Title = "User already exists", Detail = ex.Message, Status = StatusCodes.Status409Conflict });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ProblemDetails { Title = "Invalid role", Detail = ex.Message, Status = StatusCodes.Status400BadRequest });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult Me() => Ok(new
        {
            id = User.FindFirst("sub")?.Value,
            name = User.FindFirst("name")?.Value,
            role = User.FindFirst("role")?.Value,
        });
    }
}
