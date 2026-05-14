using VmsBackend.Data;

namespace VmsBackend.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db) => _db = db;

    /// <summary>
    /// AC-12: Inserts audit log before response. Fail-closed: any exception propagates as 500.
    /// AC-13: App DB role is granted INSERT only on auth_audit_log — enforced via migration SQL.
    /// </summary>
    public async Task LogEventAsync(
        string eventType,
        Guid? userId = null,
        string? username = null,
        string? role = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? sessionId = null,
        string? failureReason = null,
        string? context = null)
    {
        var entry = new AuthAuditLog
        {
            Id = Guid.NewGuid(),
            TimestampUtc = DateTime.UtcNow,
            EventType = eventType,
            UserId = userId,
            Username = username,
            Role = role,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            SessionId = sessionId,
            FailureReason = failureReason,
            Context = context
        };

        _db.AuditLogs.Add(entry);
        // Throws on failure — DO NOT catch here; let caller propagate as 500.
        await _db.SaveChangesAsync();
    }
}
