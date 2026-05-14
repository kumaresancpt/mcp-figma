using System.Text.Json;
using VmsBackend.Models;
using VmsBackend.Services;

namespace VmsBackend.Middleware;

/// <summary>
/// AC-05, AC-08: Validates session token on every non-anonymous request.
/// Skips: /api/auth/login, /api/auth/forgot-password, /api/auth/verify-otp,
///        /api/auth/reset-password, /swagger, /health
/// </summary>
public class SessionValidationMiddleware
{
    private static readonly HashSet<string> AnonymousPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/login",
        "/api/auth/forgot-password",
        "/api/auth/verify-otp",
        "/api/auth/reset-password"
    };

    private readonly RequestDelegate _next;

    public SessionValidationMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ISessionService sessionService)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Skip anonymous paths and Swagger/health
        if (IsAnonymous(path))
        {
            await _next(context);
            return;
        }

        var token = context.Request.Cookies["vms-session"];
        if (string.IsNullOrWhiteSpace(token))
        {
            await WriteUnauthorized(context);
            return;
        }

        var result = await sessionService.ValidateSessionAsync(token);
        if (result == null)
        {
            await WriteUnauthorized(context);
            return;
        }

        // Propagate identity to downstream handlers
        context.Items["UserId"] = result.Value.UserId;
        context.Items["Role"]   = result.Value.Role;

        await _next(context);
    }

    private static bool IsAnonymous(string path) =>
        AnonymousPaths.Contains(path) ||
        path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/health", StringComparison.OrdinalIgnoreCase);

    private static async Task WriteUnauthorized(HttpContext context)
    {
        context.Response.StatusCode  = 401;
        context.Response.ContentType = "application/json";
        var body = JsonSerializer.Serialize(new ErrorResponse("Session expired or invalid."));
        await context.Response.WriteAsync(body);
    }
}
