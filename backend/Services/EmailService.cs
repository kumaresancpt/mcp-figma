namespace VmsBackend.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendOtpAsync(string toEmail, string otp)
    {
        // TODO: Replace with real SMTP implementation (SmtpClient, SendGrid, etc.)
        // For development: log the OTP to console/logger
        _logger.LogInformation("📧 OTP for {Email}: {Otp} (DEVELOPMENT STUB — replace with real email service)", toEmail, otp);
        return Task.CompletedTask;
    }
}
