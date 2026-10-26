using System.ComponentModel.DataAnnotations;

namespace BugLens.Api.Models.DTOs.Auth;

public class LoginRequest
{
    [Required, StringLength(50)]
    public string Name { get; set; } = default!;

    [Required, StringLength(128)]
    public string Password { get; set; } = default!;
}