namespace BugLens.Api.Models.DTOs.Projects;

// The counts are filled in by GET /projects; a freshly created project has none yet.
// MyActiveKeyCount: keys of the signed-in user, so the list can show who still needs one.
public record ProjectResponse(
    string Id,
    string Name,
    DateTime CreatedAt,
    int MemberCount = 0,
    int MyActiveKeyCount = 0,
    long SessionCount = 0,
    long ErrorSessionCount = 0,
    DateTime? LastSessionAt = null);
