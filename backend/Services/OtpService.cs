namespace VmsBackend.Services;

public class OtpService : IOtpService
{
    /// <summary>Generates a cryptographically random 6-digit OTP string.</summary>
    public string GenerateOtp()
    {
        var bytes = new byte[4];
        System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
        var value = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1_000_000;
        return value.ToString("D6");
    }

    /// <summary>Returns BCrypt hash of the OTP (work factor 12).</summary>
    public string HashOtp(string otp) =>
        BCrypt.Net.BCrypt.HashPassword(otp, workFactor: 12);

    /// <summary>Constant-time BCrypt verification.</summary>
    public bool VerifyOtp(string otp, string hash) =>
        BCrypt.Net.BCrypt.Verify(otp, hash);
}
