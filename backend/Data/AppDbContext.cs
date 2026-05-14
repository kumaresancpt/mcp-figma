using Microsoft.EntityFrameworkCore;

namespace VmsBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<PasswordHistory> PasswordHistories => Set<PasswordHistory>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<OtpToken> OtpTokens => Set<OtpToken>();
    public DbSet<AuthAuditLog> AuditLogs => Set<AuthAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── users ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
        });

        // ── password_history ──────────────────────────────────────────────────
        modelBuilder.Entity<PasswordHistory>(e =>
        {
            e.HasOne(ph => ph.User)
             .WithMany(u => u.PasswordHistories)
             .HasForeignKey(ph => ph.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── sessions ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Session>(e =>
        {
            e.HasIndex(s => s.TokenHash).IsUnique();
            e.HasOne(s => s.User)
             .WithMany(u => u.Sessions)
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── otp_tokens ────────────────────────────────────────────────────────
        modelBuilder.Entity<OtpToken>(e =>
        {
            e.HasOne(o => o.User)
             .WithMany(u => u.OtpTokens)
             .HasForeignKey(o => o.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── auth_audit_log ────────────────────────────────────────────────────
        // MIGRATION NOTE (AC-13):
        // After running migrations, execute the following as a superuser to enforce
        // INSERT-only access for the application DB role:
        //
        //   REVOKE ALL ON TABLE auth_audit_log FROM vms_app_role;
        //   GRANT INSERT ON TABLE auth_audit_log TO vms_app_role;
        //
        // This prevents any UPDATE or DELETE on the audit log by the app role.
        modelBuilder.Entity<AuthAuditLog>(e =>
        {
            e.HasIndex(a => a.TimestampUtc);
            e.HasIndex(a => a.EventType);
            e.HasIndex(a => a.UserId);
        });
    }
}
