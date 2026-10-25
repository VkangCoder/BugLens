using System.ComponentModel.DataAnnotations;

namespace BugLens.Api.Models.DTOs.Projects;

public class CreateProjectRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = default!;
}
