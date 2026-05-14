using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VmsBackend.Models;
using VmsBackend.Services;

namespace VmsBackend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GetIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private string GetUserAgent() =>
        Request.Headers.UserAgent.ToString();

    private void SetSessionCookie(string token)
    {
        Response.Cookies.Append("vms-session", token, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = true,
            SameSite  = SameSiteMode.Strict,
            MaxAge    = TimeSpan.FromMinutes(30),
            Path      = "/"
        });
    }

    private void ClearSessionCookie()
    {
        Response.Cookies.Append("vms-session", "", new CookieOptions
        {
            HttpOnly  = true,
            Secure    = true,
            SameSite  = SameSiteMode.Strict,
            MaxAge    = TimeSpan.Zero,
            Path      = "/"
        });
    }

    // ── POST /api/auth/login (AC-01, AC-02, AC-03, AC-14) ───────────────────

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _auth.LoginAsync(request, GetIp(), GetUserAgent());
            SetSessionCookie(result.SessionToken);
            return Ok(result);
        }
        catch (AuthException ex) when (ex.StatusCode == 423)
        {
            return StatusCode(423, new ErrorResponse("Account locked", ex.RemainingSeconds));
        }
        catch (AuthException ex) when (ex.StatusCode == 401)
        {
            return Unauthorized(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }

    // ── POST /api/auth/logout (AC-07, AC-08) ─────────────────────────────────

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var token  = Request.Cookies["vms-session"];
            var userId = HttpContext.Items["UserId"] as Guid?;

            if (token == null || userId == null)
                return Unauthorized(new ErrorResponse("Not authenticated."));

            await _auth.LogoutAsync(token, userId.Value);
            ClearSessionCookie();
            return Ok(new { message = "Logged out successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }

    // ── POST /api/auth/session/extend (AC-06) ────────────────────────────────

    [HttpPost("session/extend")]
    public async Task<IActionResult> ExtendSession()
    {
        try
        {
            var token = Request.Cookies["vms-session"];
            if (token == null)
                return Unauthorized(new ErrorResponse("No session token provided."));

            await _auth.ExtendSessionAsync(token);
            SetSessionCookie(token);
            return Ok(new { message = "Session extended." });
        }
        catch (AuthException ex)
        {
            return StatusCode(ex.StatusCode, new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }

    // ── POST /api/auth/forgot-password (AC-09) ───────────────────────────────

    [HttpPost("forgot-password")]
    [EnableRateLimiting("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _auth.ForgotPasswordAsync(request.Email, GetIp(), GetUserAgent());
            // Always return neutral 200 (AC-09)
            return Ok(new { message = "If that email is registered, an OTP has been sent." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }

    // ── POST /api/auth/verify-otp (AC-09) ────────────────────────────────────

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        try
        {
            var resetToken = await _auth.VerifyOtpAsync(request.Email, request.Otp, GetIp(), GetUserAgent());
            return Ok(new { resetToken });
        }
        catch (AuthException ex) when (ex.StatusCode == 429)
        {
            return StatusCode(429, new ErrorResponse(ex.Message));
        }
        catch (AuthException ex)
        {
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }

    // ── POST /api/auth/reset-password (AC-10, AC-11) ────────────────────────

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            await _auth.ResetPasswordAsync(request.ResetToken, request.NewPassword, GetIp(), GetUserAgent());
            return Ok(new { message = "Password reset successfully." });
        }
        catch (AuthException ex)
        {
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse($"An unexpected error occurred: {ex.Message}"));
        }
    }
}
