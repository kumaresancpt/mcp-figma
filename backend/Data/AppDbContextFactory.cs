using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VmsBackend.Data;

/// <summary>
/// Allows `dotnet ef migrations add` and `dotnet ef database update` to
/// create a DbContext without starting the full application (no Redis needed).
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var host     = Environment.GetEnvironmentVariable("DB_HOST")     ?? "localhost";
        var db       = Environment.GetEnvironmentVariable("DB_NAME")     ?? "vms_figma";
        var username = Environment.GetEnvironmentVariable("DB_USERNAME") ?? "postgres";
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";

        var connStr = $"Host={host};Database={db};Username={username};Password={password}";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            .Options;

        return new AppDbContext(options);
    }
}
