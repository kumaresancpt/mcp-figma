using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record ErrorResponse(
    [property: JsonPropertyName("detail")]           string Detail,
    [property: JsonPropertyName("remainingSeconds")] int? RemainingSeconds = null
);
