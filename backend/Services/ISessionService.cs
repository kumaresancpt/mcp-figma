namespace VmsBackend.Services;

public interface ISessionService
{
    Task<string> CreateSessionAsync(Guid userId, string role, string ipAddress, string userAgent);
    Task<(Guid UserId, string Role)?> ValidateSessionAsync(string token);
    Task InvalidateSessionAsync(string token);
    Task InvalidateAllSessionsAsync(Guid userId);
    Task<bool> IsInDenylistAsync(string tokenHash);
}
