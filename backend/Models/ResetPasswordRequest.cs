using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record ResetPasswordRequest(
    [property: JsonPropertyName("resetToken")]   [Required] string ResetToken,
    [property: JsonPropertyName("newPassword")]  [Required] string NewPassword
);
