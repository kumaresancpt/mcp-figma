namespace VmsBackend.Services;

public interface IEmailService
{
    Task SendOtpAsync(string toEmail, string otp);
}
