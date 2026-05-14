import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import ResetPasswordForm from '../components/ResetPasswordForm';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Create a new secure password for your account"
      footerAction={
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline focus:outline-none"
        >
          Back to Sign In
        </button>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
