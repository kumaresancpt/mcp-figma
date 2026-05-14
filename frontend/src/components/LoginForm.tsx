import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthContext } from '../context/AuthContext';
import ErrorBanner from './ErrorBanner';

const figmaUserIcon = 'https://www.figma.com/api/mcp/asset/de5fd22d-444b-4502-a62d-e9e8176aea38';
const figmaEyeIcon  = 'https://www.figma.com/api/mcp/asset/7ce0eb90-1aa4-40f0-a5ce-ffc4a138b78b';

const roles = ['Admin', 'Receptionist', 'Security Guard'] as const;
const roleValueMap: Record<(typeof roles)[number], string> = {
  Admin: 'Admin',
  Receptionist: 'Receptionist',
  'Security Guard': 'SecurityGuard',
};

function UserIcon() {
  return (
    <img src={figmaUserIcon} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return <img src={figmaEyeIcon} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />;
  }
  // slashed-eye for hidden state
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 3 21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

export default function LoginForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuthContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]>('Admin');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLockoutSeconds(null);
    setLoading(true);

    try {
      const response = await login({
        username,
        password,
        selectedRole: roleValueMap[selectedRole],
      });
      setAuth({ role: response.role, username }, response.sessionToken);
      navigate(response.redirectUrl || '/dashboard', { replace: true });
    } catch (err: unknown) {
      const error = err as Error & { status?: number; remainingSeconds?: number };
      if (error.status === 401) {
        setErrorMessage('Invalid username or password.');
      } else if (error.status === 423) {
        setLockoutSeconds(error.remainingSeconds ?? 0);
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <ErrorBanner message={errorMessage} />

      <div className="flex rounded-full bg-[#f3f3f3] p-1">
        {roles.map((role) => {
          const isActive = role === selectedRole;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSelectedRole(role)}
              className={[
                'flex-1 rounded-full px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-200',
                isActive
                  ? 'bg-violet-700 font-semibold text-white shadow-sm'
                  : 'text-[#3c3c3c] hover:bg-white/80',
              ].join(' ')}
            >
              {role}
            </button>
          );
        })}
      </div>

      {lockoutSeconds !== null && lockoutSeconds > 0 && (
        <div
          role="alert"
          className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          Account temporarily locked. Please try again in{' '}
          <span className="font-bold">{formatTime(lockoutSeconds)}</span>.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium text-[#3b3b3b]">
          Username
        </label>
        <div className="flex h-12 items-center rounded-lg border border-[#b9b9b9] bg-white px-3 text-sm text-slate-900 transition focus-within:border-violet-700 focus-within:ring-2 focus-within:ring-violet-100">
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="h-full w-full border-0 bg-transparent pr-3 text-sm text-slate-900 placeholder:text-[#8390a2] focus:outline-none disabled:cursor-not-allowed"
            placeholder="ex., john@123"
          />
          <span className="text-violet-700">
            <UserIcon />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-[#3b3b3b]">
          Password
        </label>
        <div className="flex h-12 items-center rounded-lg border border-[#b9b9b9] bg-white px-3 text-sm text-slate-900 transition focus-within:border-violet-700 focus-within:ring-2 focus-within:ring-violet-100">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-full w-full border-0 bg-transparent pr-3 text-sm text-slate-900 placeholder:text-[#8390a2] focus:outline-none disabled:cursor-not-allowed"
            placeholder="Please Enter"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="text-violet-700 transition hover:text-violet-800 focus:outline-none"
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-2 text-[#3b3b3b]">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-[#252525] text-violet-700 focus:ring-violet-200"
          />
          <span>Keep me logged In</span>
        </label>

        <button
          type="button"
          onClick={() => navigate('/otp')}
          className="text-violet-700 underline-offset-2 transition hover:underline focus:outline-none"
        >
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || (lockoutSeconds !== null && lockoutSeconds > 0)}
        className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {loading ? 'Signing in…' : 'Login'}
      </button>

      <p className="text-center text-base text-[#353638]">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          className="font-semibold text-violet-700 underline underline-offset-2"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
