using VmsBackend.Models;

namespace VmsBackend.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress, string userAgent);
    Task LogoutAsync(string sessionToken, Guid userId);
    Task ExtendSessionAsync(string sessionToken);
    Task ForgotPasswordAsync(string email, string ipAddress, string userAgent);
    Task<string> VerifyOtpAsync(string email, string otp, string ipAddress, string userAgent);
    Task ResetPasswordAsync(string resetToken, string newPassword, string ipAddress, string userAgent);
}
