using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using VmsBackend.Data;
using VmsBackend.Middleware;
using VmsBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Connection string with env-var substitution ──────────────────────────────
var rawConnStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
var connStr = rawConnStr
    .Replace("${DB_HOST}",     Environment.GetEnvironmentVariable("DB_HOST")     ?? "localhost")
    .Replace("${DB_NAME}",     Environment.GetEnvironmentVariable("DB_NAME")     ?? "vms_figma")
    .Replace("${DB_USERNAME}", Environment.GetEnvironmentVariable("DB_USERNAME") ?? "postgres")
    .Replace("${DB_PASSWORD}", Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "");

// ── EF Core / PostgreSQL ──────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connStr));

// ── Redis ─────────────────────────────────────────────────────────────────────
var redisConnStr = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
var redisOptions = ConfigurationOptions.Parse(redisConnStr);
redisOptions.AbortOnConnectFail = false;
redisOptions.ConnectRetry = 1;
redisOptions.ConnectTimeout = 1000;
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisOptions));

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

// ── Anti-forgery ──────────────────────────────────────────────────────────────
builder.Services.AddAntiforgery(opt =>
{
    opt.HeaderName = "X-XSRF-TOKEN";
    opt.Cookie.Name = "XSRF-TOKEN";
    opt.Cookie.HttpOnly = false;  // must be readable by JS to set header
    opt.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    opt.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict;
});

// ── Rate limiting — .NET 8 built-in ──────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    // Login: 20 req/IP/min
    opt.AddPolicy("login", httpCtx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpCtx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Forgot-password: 5 req/IP/min
    opt.AddPolicy("forgot-password", httpCtx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpCtx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    opt.RejectionStatusCode = 429;
});

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "VMS Authentication API", Version = "v1" });
});

builder.Services.AddControllers();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db);
}

// ── Security headers ──────────────────────────────────────────────────────────
app.UseMiddleware<SecurityHeadersMiddleware>();

// ── Swagger — unconditional (no IsDevelopment() guard) ───────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "VMS Auth API v1");
    c.RoutePrefix = "swagger";
});

app.UseRateLimiter();
app.UseCors();

// ── Session validation ────────────────────────────────────────────────────────
app.UseMiddleware<SessionValidationMiddleware>();

app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
