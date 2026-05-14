import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, verifyOtp } from '../api/auth';
import ErrorBanner from './ErrorBanner';

const MAX_ATTEMPTS = 3;

export default function ForgotPasswordForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccessMessage('OTP sent to your email. Please check your inbox.');
      setStep('otp');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await verifyOtp({ email, otp });
      navigate('/reset-password', { state: { resetToken: result.resetToken }, replace: true });
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      if (error.status === 429) {
        setErrorMessage('Too many attempts. Please try again later.');
        setStep('email');
        setAttemptsRemaining(MAX_ATTEMPTS);
        setOtp('');
      } else {
        const remaining = attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        if (remaining <= 0) {
          setErrorMessage('Maximum OTP attempts reached. Please request a new OTP.');
          setStep('email');
          setAttemptsRemaining(MAX_ATTEMPTS);
          setOtp('');
        } else {
          setErrorMessage(
            `${error.message || 'Invalid OTP.'} ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ErrorBanner message={errorMessage} />

      {successMessage && (
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {successMessage}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="fp-email" className="text-sm font-medium text-[#3b3b3b]">
              Email Address
            </label>
            <input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 rounded-lg border border-[#b9b9b9] px-3 text-sm text-slate-900 placeholder:text-[#8390a2] focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              placeholder="Enter your registered email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6" noValidate>
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            OTP sent to <span className="font-semibold">{email}</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="otp-input" className="text-sm font-medium text-[#3b3b3b]">
              Enter OTP
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={8}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="h-12 rounded-lg border border-[#b9b9b9] px-3 text-sm tracking-[0.4em] text-slate-900 placeholder:tracking-normal placeholder:text-[#8390a2] focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              placeholder="Enter the OTP from your email"
            />
            <p className="mt-1 text-xs text-slate-500">
              Attempts remaining:{' '}
              <span className={attemptsRemaining <= 1 ? 'font-bold text-red-600' : 'font-semibold'}>
                {attemptsRemaining}
              </span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? 'Verifying…' : 'Verify OTP'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(''); setErrorMessage(null); setSuccessMessage(null); setAttemptsRemaining(MAX_ATTEMPTS); }}
            className="text-center text-sm font-medium text-violet-700 underline-offset-2 hover:underline focus:outline-none"
          >
            Resend OTP
          </button>
        </form>
      )}
    </div>
  );
}
