import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

export default function OtpPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="We&apos;ll send a one-time password to your email"
      footerAction={
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline focus:outline-none"
        >
          Back to Sign In
        </button>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
