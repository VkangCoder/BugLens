using BugLens.Api.Interfaces;
using BugLens.Api.Models;
using BugLens.Api.Models.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BugLens.Api.Auth;


namespace BugLens.Api.Controllers
{
    [Route("api/v1/auth")]
    [ApiController]
    public class AuthController(
        IAuthService authService,
        IProjectMemberService memberService,
        IProjectService projectService) : ControllerBase
    {
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Login)]
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

        [HttpGet("users")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListUsers(CancellationToken ct)
        {
            var users = await authService.ListUsersAsync(ct);
            var projectIdsByUser = await memberService.ListProjectIdsByUserAsync(ct);
            var names = await projectService.GetNamesAsync(projectIdsByUser.Values.SelectMany(ids => ids), ct);

            return Ok(users.Select(user => user with
            {
                Projects = projectIdsByUser.GetValueOrDefault(user.Id, [])
                    .Where(names.ContainsKey)
                    .Select(id => new UserProjectResponse(id, names[id]))
                    .OrderBy(p => p.Name)
                    .ToList(),
            }).ToList());
        }


        // The deleted user's sign-in token keeps working until it expires (JWT is stateless)
        [HttpDelete("users/{id}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> DeleteUser(string id, CancellationToken ct)
        {
            var result = await authService.DeleteUserAsync(id, User.FindFirst("sub")?.Value, ct);

            // Their personal ingest keys must stop working too, not just their sign-in
            if (result == DeleteUserResult.Deleted)
                await memberService.RemoveUserAsync(id, ct);

            return result switch
            {
                DeleteUserResult.Deleted => NoContent(),
                DeleteUserResult.Self => Conflict(new ProblemDetails { Title = "Can't delete yourself", Detail = "Ask another admin to remove your account.", Status = StatusCodes.Status409Conflict }),
                DeleteUserResult.LastAdmin => Conflict(new ProblemDetails { Title = "Last admin", Detail = "Create another admin before deleting this one.", Status = StatusCodes.Status409Conflict }),
                _ => NotFound(),
            };
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