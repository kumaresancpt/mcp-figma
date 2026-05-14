using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record LoginResponse(
    [property: JsonPropertyName("sessionToken")] string SessionToken,
    [property: JsonPropertyName("redirectUrl")]  string RedirectUrl,
    [property: JsonPropertyName("role")]         string Role
);
