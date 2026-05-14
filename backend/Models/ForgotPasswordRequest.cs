using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record ForgotPasswordRequest(
    [property: JsonPropertyName("email")] [Required] [EmailAddress] string Email
);
