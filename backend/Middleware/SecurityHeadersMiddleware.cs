namespace VmsBackend.Middleware;

/// <summary>
/// AC per BR-SEC-05/06: Adds security response headers on every response.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Add headers BEFORE the response starts
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;

            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            headers["X-Content-Type-Options"]    = "nosniff";
            headers["X-Frame-Options"]           = "DENY";
            headers["Content-Security-Policy"]   = "default-src 'self'";
            headers["Cache-Control"]             = "no-store";
            headers["Pragma"]                    = "no-cache";

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
