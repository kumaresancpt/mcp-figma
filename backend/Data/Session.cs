using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VmsBackend.Data;

[Table("sessions")]
public class Session
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>SHA-256 hash of the opaque session token UUID.</summary>
    [Required]
    [Column("token_hash")]
    [MaxLength(100)]
    public string TokenHash { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("last_activity")]
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;

    [Column("is_valid")]
    public bool IsValid { get; set; } = true;

    [Column("ip_address")]
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }
}
