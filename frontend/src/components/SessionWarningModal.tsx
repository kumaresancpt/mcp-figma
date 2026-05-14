import { logout, extendSession } from '../api/auth';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SessionWarningModalProps {
  isVisible: boolean;
  onClose: () => void;
  minutesRemaining: number;
}

export default function SessionWarningModal({
  isVisible,
  onClose,
  minutesRemaining,
}: SessionWarningModalProps) {
  const { clearAuth } = useAuthContext();
  const navigate = useNavigate();

  if (!isVisible) return null;

  const handleExtend = async () => {
    try {
      await extendSession();
      onClose();
    } catch {
      // If extend fails, force logout
      handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white px-6 py-8 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Session Expiring Soon</h2>
        <p className="mb-6 text-sm text-gray-600">
          Your session will expire in{' '}
          <span className="font-bold text-amber-600">{minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}</span>.
          Would you like to extend your session?
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            Extend Session
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
