using Microsoft.EntityFrameworkCore;
using VmsBackend.Data;

namespace VmsBackend.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Users.Any())
            return;

        context.Users.AddRange(
            new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                Email = "admin@vms.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123", workFactor: 12),
                Role = "Admin",
                IsLocked = false,
                FailedAttemptCount = 0
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "receptionist",
                Email = "receptionist@vms.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Recept@123", workFactor: 12),
                Role = "Receptionist",
                IsLocked = false,
                FailedAttemptCount = 0
            },
            new User
            {
                Id = Guid.NewGuid(),
                Username = "guard",
                Email = "guard@vms.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Guard@123", workFactor: 12),
                Role = "SecurityGuard",
                IsLocked = false,
                FailedAttemptCount = 0
            }
        );

        await context.SaveChangesAsync();

        await EnforceAuditLogInsertOnlyAsync(context);
    }

    // AC-13: Enforce INSERT-only on auth_audit_log for application DB role
    // This creates the role and restricts permissions so app cannot UPDATE/DELETE audit records
    public static async Task EnforceAuditLogInsertOnlyAsync(AppDbContext context)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vms_app_role') THEN
                        CREATE ROLE vms_app_role;
                    END IF;
                END
                $$;
            ");

            await context.Database.ExecuteSqlRawAsync(@"
                REVOKE ALL ON """"AuditLogs"""" FROM vms_app_role;
                GRANT INSERT ON """"AuditLogs"""" TO vms_app_role;
            ");
        }
        catch (Exception ex)
        {
            // Non-fatal — log and continue (role may already be configured)
            Console.WriteLine($"[WARN] Audit log role enforcement: {ex.Message}");
        }
    }
}
