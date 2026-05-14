namespace VmsBackend.Services;

public interface IAuditService
{
    /// <summary>
    /// Inserts an audit log entry BEFORE the API response is sent.
    /// If the insert fails, propagates the exception (fail-closed — AC-12).
    /// </summary>
    Task LogEventAsync(
        string eventType,
        Guid? userId = null,
        string? username = null,
        string? role = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? sessionId = null,
        string? failureReason = null,
        string? context = null);
}
