using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VmsBackend.Data;

/// <summary>
/// Immutable audit log — app DB role has INSERT only on this table (see migration notes).
/// No UPDATE or DELETE is ever issued by the application.
/// </summary>
[Table("auth_audit_log")]
public class AuthAuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("timestamp_utc")]
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("event_type")]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty;

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Column("username")]
    [MaxLength(200)]
    public string? Username { get; set; }

    [Column("role")]
    [MaxLength(50)]
    public string? Role { get; set; }

    [Column("ip_address")]
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [Column("session_id")]
    [MaxLength(100)]
    public string? SessionId { get; set; }

    [Column("failure_reason")]
    [MaxLength(500)]
    public string? FailureReason { get; set; }

    [Column("context")]
    [MaxLength(2000)]
    public string? Context { get; set; }
}
