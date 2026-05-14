using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VmsBackend.Models;

public record LoginRequest(
    [property: JsonPropertyName("username")] [Required] string Username,
    [property: JsonPropertyName("password")] [Required] string Password,
    [property: JsonPropertyName("selectedRole")] [Required] string SelectedRole
);
