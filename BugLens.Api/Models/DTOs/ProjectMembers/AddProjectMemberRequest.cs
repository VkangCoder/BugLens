using System.ComponentModel.DataAnnotations;

namespace BugLens.Api.Models.DTOs.ProjectMembers;

public sealed record AddProjectMemberRequest(
    [Required] string UserId);
