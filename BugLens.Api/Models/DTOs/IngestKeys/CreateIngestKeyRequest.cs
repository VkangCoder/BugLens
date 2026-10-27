
using System.ComponentModel.DataAnnotations;

namespace BugLens.Api.Models.DTOs.IngestKeys;

public sealed record CreateIngestKeyRequest(
    [Required]
    [StringLength(80, MinimumLength = 1)]
    string Name);
