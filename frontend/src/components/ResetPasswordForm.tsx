import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import ErrorBanner from './ErrorBanner';

interface PasswordValidation {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
}

function validatePassword(pw: string): PasswordValidation {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw),
  };
}

function isPasswordValid(v: PasswordValidation): boolean {
  return Object.values(v).every(Boolean);
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M3 3 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.58 10.58A2 2 0 0 0 13.4 13.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.88 5.08A11.4 11.4 0 0 1 12 4.9c6.4 0 10 7.1 10 7.1a16.6 16.6 0 0 1-4.04 4.59"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.23 6.23A16.35 16.35 0 0 0 2 12s3.6 7.1 10 7.1a11.5 11.5 0 0 0 5.77-1.53"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RULES = [
  { key: 'minLength' as const, label: 'At least 8 characters' },
  { key: 'hasUpper' as const, label: 'One uppercase letter' },
  { key: 'hasLower' as const, label: 'One lowercase letter' },
  { key: 'hasDigit' as const, label: 'One number' },
  { key: 'hasSpecial' as const, label: 'One special character' },
];

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string } | null)?.resetToken ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPasswordValid(validation)) {
      setErrorMessage('Password does not meet the complexity requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setErrorMessage('Invalid reset session. Please restart the forgot password flow.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ resetToken, newPassword });
      setSuccessMessage('Password reset successfully! Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <ErrorBanner message={errorMessage} />

      {successMessage && (
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="text-sm font-medium text-[#3b3b3b]">
          New Password
        </label>
        <div className="flex h-12 items-center rounded-lg border border-[#b9b9b9] bg-white px-3 text-sm text-slate-900 transition focus-within:border-violet-700 focus-within:ring-2 focus-within:ring-violet-100">
          <input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            className="h-full w-full border-0 bg-transparent pr-3 text-sm text-slate-900 placeholder:text-[#8390a2] focus:outline-none disabled:cursor-not-allowed"
            placeholder="Enter new password"
          />
          <button
            type="button"
            aria-label={showNew ? 'Hide password' : 'Show password'}
            onClick={() => setShowNew((v) => !v)}
            className="text-violet-700 transition hover:text-violet-800"
          >
            <EyeIcon open={showNew} />
          </button>
        </div>

        {newPassword.length > 0 && (
          <ul className="mt-2 grid gap-2 rounded-xl bg-[#f7f3ff] p-4">
            {RULES.map(({ key, label }) => (
              <li
                key={key}
                className={`flex items-center gap-2 text-xs ${
                  validation[key] ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                  {validation[key] ? '✓' : '!'}
                </span>
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-[#3b3b3b]">
          Confirm Password
        </label>
        <div
          className={[
            'flex h-12 items-center rounded-lg bg-white px-3 text-sm text-slate-900 transition focus-within:ring-2',
            confirmPassword.length > 0 && !passwordsMatch
              ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-100'
              : 'border border-[#b9b9b9] focus-within:border-violet-700 focus-within:ring-violet-100',
          ].join(' ')}
        >
          <input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="h-full w-full border-0 bg-transparent pr-3 text-sm text-slate-900 placeholder:text-[#8390a2] focus:outline-none disabled:cursor-not-allowed"
            placeholder="Re-enter new password"
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            onClick={() => setShowConfirm((v) => !v)}
            className="text-violet-700 transition hover:text-violet-800"
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="mt-1 text-xs text-rose-600">Passwords do not match.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !isPasswordValid(validation) || !passwordsMatch}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {loading ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  );
}
