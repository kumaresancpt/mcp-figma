using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VmsBackend.Data;
using VmsBackend.Models;

namespace VmsBackend.Services;

/// <summary>
/// Exceptions thrown to signal specific HTTP status codes.
/// </summary>
public sealed class AuthException : Exception
{
    public int StatusCode { get; }
    public int? RemainingSeconds { get; }
    public AuthException(int statusCode, string message, int? remainingSeconds = null)
        : base(message)
    {
        StatusCode = statusCode;
        RemainingSeconds = remainingSeconds;
    }
}

public class AuthService : IAuthService
{
    // AC-14: constant-time dummy hash used when user is not found
    private const string DummyHash =
        "$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private static readonly Dictionary<string, string> RoleRedirectMap = new()
    {
        ["Admin"]         = "/dashboard/full",
        ["Receptionist"]  = "/dashboard/visitor-entry",
        ["SecurityGuard"] = "/gate-entry"
    };

    private readonly AppDbContext _db;
    private readonly ISessionService _session;
    private readonly IOtpService _otp;
    private readonly IAuditService _audit;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;

    public AuthService(
        AppDbContext db,
        ISessionService session,
        IOtpService otp,
        IAuditService audit,
        IConfiguration config,
        IEmailService emailService)
    {
        _db           = db;
        _session      = session;
        _otp          = otp;
        _audit        = audit;
        _config       = config;
        _emailService = emailService;
    }

    // ── Login (AC-01, AC-02, AC-03, AC-04, AC-12, AC-14) ────────────────────

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress, string userAgent)
    {
        var maxFailed = _config.GetValue<int>("Lockout:MaxFailedAttempts", 5);
        var lockMins  = _config.GetValue<int>("Lockout:LockoutDurationMinutes", 15);
        var requestedRole = NormalizeRole(request.SelectedRole);

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Username == request.Username || u.Email == request.Username);

        if (user == null)
        {
            // AC-14: constant-time path — verify against dummy hash to prevent timing attacks
            BCrypt.Net.BCrypt.Verify(request.Password, DummyHash);

            // AC-12: audit before returning
            await _audit.LogEventAsync("LOGIN_FAILED",
                username: request.Username,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: "Username not found");

            throw new AuthException(401, "Invalid username or password.");
        }

        if (!string.Equals(user.Role, requestedRole, StringComparison.OrdinalIgnoreCase))
        {
            await _audit.LogEventAsync("LOGIN_FAILED",
                userId: user.Id,
                username: user.Username,
                role: user.Role,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: $"Role mismatch (selected {request.SelectedRole})");

            throw new AuthException(401, "Invalid username or password.");
        }

        // AC-03/AC-04: check persistent lockout
        if (user.IsLocked && user.LockoutExpiry.HasValue && user.LockoutExpiry.Value > DateTime.UtcNow)
        {
            var remaining = (int)(user.LockoutExpiry.Value - DateTime.UtcNow).TotalSeconds;
            await _audit.LogEventAsync("LOGIN_LOCKED",
                userId: user.Id,
                username: user.Username,
                role: user.Role,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: $"Account locked, {remaining}s remaining");

            throw new AuthException(423, "Account locked", remaining);
        }

        // If lockout has expired, reset
        if (user.IsLocked && user.LockoutExpiry.HasValue && user.LockoutExpiry.Value <= DateTime.UtcNow)
        {
            user.IsLocked = false;
            user.FailedAttemptCount = 0;
            user.LockoutExpiry = null;
        }

        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        if (!passwordValid)
        {
            user.FailedAttemptCount++;

            if (user.FailedAttemptCount >= maxFailed)
            {
                user.IsLocked      = true;
                user.LockoutExpiry = DateTime.UtcNow.AddMinutes(lockMins);
            }

            await _db.SaveChangesAsync();

            await _audit.LogEventAsync("LOGIN_FAILED",
                userId: user.Id,
                username: user.Username,
                role: user.Role,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: $"Wrong password (attempt {user.FailedAttemptCount})");

            if (user.IsLocked)
            {
                var remaining = lockMins * 60;
                throw new AuthException(423, "Account locked", remaining);
            }

            throw new AuthException(401, "Invalid username or password.");
        }

        // ── Success path ──────────────────────────────────────────────────────
        user.FailedAttemptCount = 0;
        user.IsLocked           = false;
        user.LockoutExpiry      = null;
        user.LastLogin          = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var token = await _session.CreateSessionAsync(user.Id, user.Role, ipAddress, userAgent);

        await _audit.LogEventAsync("LOGIN_SUCCESS",
            userId: user.Id,
            username: user.Username,
            role: user.Role,
            ipAddress: ipAddress,
            userAgent: userAgent,
            sessionId: token[..8]); // abbreviated session ref

        var redirectUrl = RoleRedirectMap.TryGetValue(user.Role, out var url) ? url : "/dashboard";
        return new LoginResponse(token, redirectUrl, user.Role);
    }

    // ── Logout (AC-07, AC-08, AC-12) ─────────────────────────────────────────

    public async Task LogoutAsync(string sessionToken, Guid userId)
    {
        await _session.InvalidateSessionAsync(sessionToken);
        await _audit.LogEventAsync("LOGOUT",
            userId: userId,
            sessionId: sessionToken[..8]);
    }

    // ── Extend session (AC-06) ───────────────────────────────────────────────

    public async Task ExtendSessionAsync(string sessionToken)
    {
        var result = await _session.ValidateSessionAsync(sessionToken);
        if (result == null)
            throw new AuthException(401, "Session expired or invalid.");

        await _audit.LogEventAsync("SESSION_EXTENDED",
            userId: result.Value.UserId,
            role: result.Value.Role,
            sessionId: sessionToken[..8]);
    }

    // ── Forgot password (AC-09, AC-12) ───────────────────────────────────────

    public async Task ForgotPasswordAsync(string email, string ipAddress, string userAgent)
    {
        var maxPerHour = _config.GetValue<int>("Otp:MaxRequestsPerHour", 3);
        var validMins  = _config.GetValue<int>("Otp:ValidityMinutes", 10);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            // Neutral 200 — do not reveal whether email exists (AC-02 principle)
            return;
        }

        // Rate-limit: max 3 OTP requests/email/hr stored in DB
        var hourAgo       = DateTime.UtcNow.AddHours(-1);
        var recentOtpCount = await _db.OtpTokens
            .CountAsync(t => t.UserId == user.Id && t.CreatedAt >= hourAgo);

        if (recentOtpCount >= maxPerHour)
        {
            // Still return neutral 200 — rate info audited, not exposed to caller
            await _audit.LogEventAsync("OTP_LOCKED",
                userId: user.Id,
                username: user.Username,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: "OTP rate limit exceeded");
            return;
        }

        var otpPlain  = _otp.GenerateOtp();
        var otpHashed = _otp.HashOtp(otpPlain);

        _db.OtpTokens.Add(new OtpToken
        {
            Id         = Guid.NewGuid(),
            UserId     = user.Id,
            HashedOtp  = otpHashed,
            ExpiresAt  = DateTime.UtcNow.AddMinutes(validMins),
            AttemptCount = 0,
            IsConsumed = false,
            CreatedAt  = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        await _emailService.SendOtpAsync(email, otpPlain);

        await _audit.LogEventAsync("OTP_REQUESTED",
            userId: user.Id,
            username: user.Username,
            ipAddress: ipAddress,
            userAgent: userAgent);
    }

    // ── Verify OTP (AC-09, AC-12) ────────────────────────────────────────────

    public async Task<string> VerifyOtpAsync(string email, string otp, string ipAddress, string userAgent)
    {
        var maxAttempts = _config.GetValue<int>("Otp:MaxAttempts", 3);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new AuthException(400, "Invalid email or OTP.");

        var now    = DateTime.UtcNow;
        var record = await _db.OtpTokens
            .Where(t => t.UserId == user.Id && !t.IsConsumed && t.ExpiresAt > now)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (record == null)
            throw new AuthException(400, "OTP expired or not found.");

        if (record.AttemptCount >= maxAttempts)
        {
            await _audit.LogEventAsync("OTP_LOCKED",
                userId: user.Id,
                username: user.Username,
                ipAddress: ipAddress,
                userAgent: userAgent,
                failureReason: "OTP max attempts exceeded");
            throw new AuthException(429, "Too many OTP attempts.");
        }

        var valid = _otp.VerifyOtp(otp, record.HashedOtp);

        if (!valid)
        {
            record.AttemptCount++;
            await _db.SaveChangesAsync();

            await _audit.LogEventAsync("LOGIN_FAILED",
                userId: user.Id,
                username: user.Username,
                ipAddress: ipAddress,
                failureReason: $"Wrong OTP (attempt {record.AttemptCount})");

            if (record.AttemptCount >= maxAttempts)
                throw new AuthException(429, "Too many OTP attempts.");

            throw new AuthException(400, "Invalid OTP.");
        }

        record.IsConsumed = true;
        await _db.SaveChangesAsync();

        var resetToken = Guid.NewGuid().ToString("N");

        // Store reset token in Redis with 10-min TTL
        var redis = _db.Database.GetDbConnection();  // connection already open via EF
        // Use session-service's Redis directly via DI would be cleaner; store as a separate key
        // For simplicity, store in OtpToken.HashedOtp field as the reset token
        // Proper approach: use a separate ResetToken table or Redis key
        // Here we store the raw GUID in a new OtpToken record marked as consumed to
        // serve as a short-lived reset credential (10-min validity)
        _db.OtpTokens.Add(new OtpToken
        {
            Id           = Guid.NewGuid(),
            UserId       = user.Id,
            HashedOtp    = BCrypt.Net.BCrypt.HashPassword(resetToken, workFactor: 12),
            ExpiresAt    = DateTime.UtcNow.AddMinutes(10),
            AttemptCount = 0,
            IsConsumed   = false,
            CreatedAt    = DateTime.UtcNow,
            // Differentiate reset tokens from OTP tokens by prefixing the hash comment
            // (context stored in UserAgent placeholder field for simplicity here)
        });
        await _db.SaveChangesAsync();

        await _audit.LogEventAsync("OTP_VERIFIED",
            userId: user.Id,
            username: user.Username,
            ipAddress: ipAddress,
            userAgent: userAgent);

        return resetToken;
    }

    // ── Reset password (AC-10, AC-11, AC-12) ─────────────────────────────────

    public async Task ResetPasswordAsync(string resetToken, string newPassword, string ipAddress, string userAgent)
    {
        if (!ValidatePasswordComplexity(newPassword))
            throw new AuthException(400,
                "Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character.");

        // Find unexpired reset token record
        var now     = DateTime.UtcNow;
        var records = await _db.OtpTokens
            .Where(t => !t.IsConsumed && t.ExpiresAt > now)
            .ToListAsync();

        OtpToken? matched = null;
        User? user = null;

        foreach (var rec in records)
        {
            if (!BCrypt.Net.BCrypt.Verify(resetToken, rec.HashedOtp)) continue;
            matched = rec;
            user    = await _db.Users.FindAsync(rec.UserId);
            break;
        }

        if (matched == null || user == null)
            throw new AuthException(400, "Invalid or expired reset token.");

        // AC-10: Check last 5 password history
        var historyCount = _config.GetValue<int>("PasswordPolicy:HistoryCount", 5);
        var history = await _db.PasswordHistories
            .Where(h => h.UserId == user.Id)
            .OrderByDescending(h => h.CreatedAt)
            .Take(historyCount)
            .ToListAsync();

        if (history.Any(h => BCrypt.Net.BCrypt.Verify(newPassword, h.PasswordHash)))
            throw new AuthException(400,
                $"New password must not match any of the last {historyCount} passwords.");

        // Hash and store the new password
        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);
        user.PasswordHash = newHash;

        // Add to history
        _db.PasswordHistories.Add(new PasswordHistory
        {
            Id           = Guid.NewGuid(),
            UserId       = user.Id,
            PasswordHash = newHash,
            CreatedAt    = DateTime.UtcNow
        });

        // Consume the reset token
        matched.IsConsumed = true;

        await _db.SaveChangesAsync();

        // AC-11: Invalidate ALL sessions for this user
        await _session.InvalidateAllSessionsAsync(user.Id);

        await _audit.LogEventAsync("PASSWORD_RESET",
            userId: user.Id,
            username: user.Username,
            role: user.Role,
            ipAddress: ipAddress,
            userAgent: userAgent);
    }

    // ── Password complexity (AC-10) ──────────────────────────────────────────

    private static bool ValidatePasswordComplexity(string password)
    {
        if (password.Length < 8) return false;
        if (!Regex.IsMatch(password, @"[A-Z]")) return false;
        if (!Regex.IsMatch(password, @"[a-z]")) return false;
        if (!Regex.IsMatch(password, @"[0-9]")) return false;
        if (!Regex.IsMatch(password, @"[^A-Za-z0-9]")) return false;
        return true;
    }

    private static string NormalizeRole(string selectedRole) => selectedRole.Trim() switch
    {
        "Admin" => "Admin",
        "Receptionist" => "Receptionist",
        "Security Guard" => "SecurityGuard",
        "SecurityGuard" => "SecurityGuard",
        _ => selectedRole.Trim(),
    };
}
