using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record VerifyOtpRequest(
    [property: JsonPropertyName("email")] [Required] [EmailAddress] string Email,
    [property: JsonPropertyName("otp")]   [Required] string Otp
);
