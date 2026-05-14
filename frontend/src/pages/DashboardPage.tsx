import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import LogoutButton from '../components/LogoutButton';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  security_guard: 'Security Guard',
};

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
              VMS
            </div>
            <span className="text-base font-semibold text-gray-900">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Signed in as <span className="font-medium text-gray-800">{user.username}</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-8 py-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Welcome, {user.username}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            You are logged in as{' '}
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </p>
          <p className="text-sm text-gray-400">
            Select a section from the navigation to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
