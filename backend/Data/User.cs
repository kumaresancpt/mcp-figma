using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VmsBackend.Data;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("username")]
    [MaxLength(200)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [Column("email")]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Column("password_hash")]
    [MaxLength(100)]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Admin | Receptionist | SecurityGuard</summary>
    [Required]
    [Column("role")]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;

    [Column("is_locked")]
    public bool IsLocked { get; set; } = false;

    [Column("lockout_expiry")]
    public DateTime? LockoutExpiry { get; set; }

    [Column("failed_attempt_count")]
    public int FailedAttemptCount { get; set; } = 0;

    [Column("last_login")]
    public DateTime? LastLogin { get; set; }

    public ICollection<PasswordHistory> PasswordHistories { get; set; } = new List<PasswordHistory>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    public ICollection<OtpToken> OtpTokens { get; set; } = new List<OtpToken>();
}
