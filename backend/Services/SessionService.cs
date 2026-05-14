using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using VmsBackend.Data;

namespace VmsBackend.Services;

public class SessionService : ISessionService
{
    private sealed record SessionCacheEntry(string Value, DateTime ExpiresAt);

    private readonly IConnectionMultiplexer _redis;
    private readonly AppDbContext _db;
    private readonly TimeSpan _sessionTtl = TimeSpan.FromMinutes(30);
    private const string DenylistPrefix = "denylist:";
    private const string SessionPrefix  = "session:";
    private static readonly ConcurrentDictionary<string, SessionCacheEntry> SessionCache = new();
    private static readonly ConcurrentDictionary<string, DateTime> DenylistCache = new();

    public SessionService(IConnectionMultiplexer redis, AppDbContext db)
    {
        _redis = redis;
        _db    = db;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private IDatabase? TryGetDatabase()
    {
        try
        {
            return _redis.IsConnected ? _redis.GetDatabase() : null;
        }
        catch
        {
            return null;
        }
    }

    private static bool IsExpired(DateTime expiresAt) => expiresAt <= DateTime.UtcNow;

    // ── CreateSession (AC-01, AC-05) ─────────────────────────────────────────

    public async Task<string> CreateSessionAsync(Guid userId, string role, string ipAddress, string userAgent)
    {
        var token     = Guid.NewGuid().ToString("N");
        var tokenHash = HashToken(token);
        var now       = DateTime.UtcNow;
        var expiresAt = now.Add(_sessionTtl);
        var cacheValue = $"{userId}|{role}";

        SessionCache[tokenHash] = new SessionCacheEntry(cacheValue, expiresAt);

        var redisDb = TryGetDatabase();
        if (redisDb != null)
        {
            try
            {
                await redisDb.StringSetAsync($"{SessionPrefix}{tokenHash}", cacheValue, _sessionTtl);
            }
            catch
            {
                // Local development can continue with the in-memory session cache.
            }
        }

        // Persist to DB (AC-04: survives restarts)
        _db.Sessions.Add(new Session
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            TokenHash   = tokenHash,
            CreatedAt   = now,
            ExpiresAt   = expiresAt,
            LastActivity= now,
            IsValid     = true,
            IpAddress   = ipAddress,
            UserAgent   = userAgent
        });
        await _db.SaveChangesAsync();

        return token;
    }

    // ── ValidateSession (AC-05, AC-08) ───────────────────────────────────────

    public async Task<(Guid UserId, string Role)?> ValidateSessionAsync(string token)
    {
        var tokenHash = HashToken(token);
        var now = DateTime.UtcNow;

        // Check denylist first (AC-08)
        if (await IsInDenylistAsync(tokenHash))
            return null;

        string? cachedValue = null;
        var redisDb = TryGetDatabase();
        if (redisDb != null)
        {
            try
            {
                var redisValue = await redisDb.StringGetAsync($"{SessionPrefix}{tokenHash}");
                if (redisValue.HasValue)
                {
                    cachedValue = redisValue!;
                }
            }
            catch
            {
                // Fall back to in-memory session state.
            }
        }

        if (cachedValue == null && SessionCache.TryGetValue(tokenHash, out var memoryEntry))
        {
            if (IsExpired(memoryEntry.ExpiresAt))
            {
                SessionCache.TryRemove(tokenHash, out _);
            }
            else
            {
                cachedValue = memoryEntry.Value;
            }
        }

        Guid userId;
        string role;

        if (cachedValue != null)
        {
            var parts = cachedValue.Split('|');
            if (parts.Length != 2 || !Guid.TryParse(parts[0], out userId))
                return null;

            role = parts[1];
        }
        else
        {
            var sessionFromDb = await _db.Sessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsValid && s.ExpiresAt > now);

            if (sessionFromDb == null)
                return null;

            userId = sessionFromDb.UserId;
            role = sessionFromDb.User.Role;
            SessionCache[tokenHash] = new SessionCacheEntry($"{userId}|{role}", now.Add(_sessionTtl));
        }

        if (redisDb != null)
        {
            try
            {
                await redisDb.KeyExpireAsync($"{SessionPrefix}{tokenHash}", _sessionTtl);
            }
            catch
            {
                // Ignore Redis refresh failures when running without Redis.
            }
        }

        SessionCache[tokenHash] = new SessionCacheEntry($"{userId}|{role}", now.Add(_sessionTtl));

        // Update LastActivity in DB
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsValid);
        if (session != null)
        {
            session.LastActivity = now;
            session.ExpiresAt    = now.Add(_sessionTtl);
            await _db.SaveChangesAsync();
        }

        return (userId, role);
    }

    // ── InvalidateSession (AC-07, AC-08) ─────────────────────────────────────

    public async Task InvalidateSessionAsync(string token)
    {
        var tokenHash = HashToken(token);
        SessionCache.TryRemove(tokenHash, out _);
        DenylistCache[tokenHash] = DateTime.UtcNow.Add(_sessionTtl);

        var redisDb = TryGetDatabase();
        if (redisDb != null)
        {
            try
            {
                await redisDb.KeyDeleteAsync($"{SessionPrefix}{tokenHash}");
                await redisDb.StringSetAsync($"{DenylistPrefix}{tokenHash}", "1", _sessionTtl);
            }
            catch
            {
                // Ignore Redis failures when local memory is backing session state.
            }
        }

        // Mark invalid in DB
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash);
        if (session != null)
        {
            session.IsValid = false;
            await _db.SaveChangesAsync();
        }
    }

    // ── InvalidateAllSessions (AC-11) ────────────────────────────────────────

    public async Task InvalidateAllSessionsAsync(Guid userId)
    {
        var sessions = await _db.Sessions
            .Where(s => s.UserId == userId && s.IsValid)
            .ToListAsync();

        var redisDb = TryGetDatabase();

        foreach (var session in sessions)
        {
            session.IsValid = false;
            SessionCache.TryRemove(session.TokenHash, out _);
            DenylistCache[session.TokenHash] = DateTime.UtcNow.Add(_sessionTtl);

            if (redisDb != null)
            {
                try
                {
                    await redisDb.KeyDeleteAsync($"{SessionPrefix}{session.TokenHash}");
                    await redisDb.StringSetAsync($"{DenylistPrefix}{session.TokenHash}", "1", _sessionTtl);
                }
                catch
                {
                    // Ignore Redis failures when local memory is backing session state.
                }
            }
        }

        if (sessions.Count > 0)
            await _db.SaveChangesAsync();
    }

    // ── IsInDenylist ──────────────────────────────────────────────────────────

    public async Task<bool> IsInDenylistAsync(string tokenHash)
    {
        if (DenylistCache.TryGetValue(tokenHash, out var expiresAt))
        {
            if (IsExpired(expiresAt))
            {
                DenylistCache.TryRemove(tokenHash, out _);
            }
            else
            {
                return true;
            }
        }

        var redisDb = TryGetDatabase();
        if (redisDb == null)
            return false;

        try
        {
            return await redisDb.KeyExistsAsync($"{DenylistPrefix}{tokenHash}");
        }
        catch
        {
            return false;
        }
    }
}
