
namespace BugLens.Api.Models.DTOs.ProjectMembers;

public sealed record ProjectMemberResponse(
    string UserId,
    string UserName,
    string Role,
    string AddedByUserId,
    DateTime CreatedAt);
