using System.ComponentModel.DataAnnotations;

namespace BugLens.Api.Models.DTOs.Auth;

public class CreateUserRequest
{
    [Required, RegularExpression(@"^[\p{L}\p{N}._-]{3,50}$",
    ErrorMessage = "Name must be 3-50 chars: letters, digits, '.', '_' or '-'.")]
    public string Name { get; set; } = default!;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = default!;

    [Required, AllowedValues(Roles.Admin, Roles.Dev)]
    public string Role { get; set; } = Roles.Dev;
}