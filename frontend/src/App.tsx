import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SessionWarningModal from './components/SessionWarningModal';
import { useAuthContext } from './context/AuthContext';
import { logout } from './api/auth';

const WARN_AT_MS = 25 * 60 * 1000;   // 25 minutes → show warning
const LOGOUT_AT_MS = 30 * 60 * 1000; // 30 minutes → force logout

function IdleManager() {
  const { isAuthenticated, clearAuth } = useAuthContext();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    if (!isAuthenticated) return;

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, WARN_AT_MS);

    logoutTimerRef.current = setTimeout(async () => {
      try {
        await logout();
      } catch {
        // ignore network errors on auto-logout
      }
      clearAuth();
      navigate('/login', { replace: true });
    }, LOGOUT_AT_MS);
  }, [isAuthenticated, clearAuth, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      return;
    }

    const events = ['mousemove', 'keypress', 'click', 'touchstart'] as const;
    const handler = () => {
      setShowWarning(false);
      resetTimers();
    };

    events.forEach((e) => window.addEventListener(e, handler, true));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler, true));
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [isAuthenticated, resetTimers]);

  const handleClose = () => {
    setShowWarning(false);
    resetTimers();
  };

  return (
    <SessionWarningModal
      isVisible={showWarning && isAuthenticated}
      onClose={handleClose}
      minutesRemaining={5}
    />
  );
}

export default function App() {
  return (
    <>
      <IdleManager />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard/*" element={<DashboardPage />} />
      </Routes>
    </>
  );
}
