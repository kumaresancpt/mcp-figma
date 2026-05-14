import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderLoginForm = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </MemoryRouter>
  );

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders updated login form fields and static actions', () => {
    renderLoginForm();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receptionist' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security Guard' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Keep me logged In')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forgot Password?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('allows switching the selected role tab', async () => {
    const user = userEvent.setup();

    renderLoginForm();

    const adminTab = screen.getByRole('button', { name: 'Admin' });
    const receptionistTab = screen.getByRole('button', { name: 'Receptionist' });

    expect(adminTab).toHaveAttribute('aria-pressed', 'true');
    expect(receptionistTab).toHaveAttribute('aria-pressed', 'false');

    await user.click(receptionistTab);

    expect(receptionistTab).toHaveAttribute('aria-pressed', 'true');
    expect(adminTab).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC-01: submitting valid credentials redirects to role-specific URL', async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValueOnce({
      sessionToken: 'test-token-123',
      redirectUrl: '/dashboard/full',
      role: 'Admin',
    });

    renderLoginForm();

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'Admin@123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'admin',
        password: 'Admin@123',
        selectedRole: 'Admin',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/full', { replace: true });
    });
  });

  test('submitting with another selected role sends that role in the login payload', async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValueOnce({
      sessionToken: 'guard-token-123',
      redirectUrl: '/gate-entry',
      role: 'SecurityGuard',
    });

    renderLoginForm();

    await user.click(screen.getByRole('button', { name: 'Security Guard' }));
    await user.type(screen.getByLabelText('Username'), 'guard');
    await user.type(screen.getByLabelText('Password'), 'Guard@123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'guard',
        password: 'Guard@123',
        selectedRole: 'SecurityGuard',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/gate-entry', { replace: true });
    });
  });

  test('AC-02: invalid credentials shows generic error message', async () => {
    const user = userEvent.setup();

    const error = new Error('Invalid username or password.') as Error & {
      status?: number;
    };
    error.status = 401;
    mockLogin.mockRejectedValueOnce(error);

    renderLoginForm();

    await user.type(screen.getByLabelText('Username'), 'wronguser');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      // ErrorBanner renders with role="alert"
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('AC-03: account lockout (HTTP 423) shows lockout alert with remaining time', async () => {
    const user = userEvent.setup();

    const error = new Error('Account locked') as Error & {
      status?: number;
      remainingSeconds?: number;
    };
    error.status = 423;
    error.remainingSeconds = 840;
    mockLogin.mockRejectedValueOnce(error);

    renderLoginForm();

    await user.type(screen.getByLabelText('Username'), 'lockeduser');
    await user.type(screen.getByLabelText('Password'), 'anypass');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      // Lockout div renders with role="alert" and text about temporary lock
      expect(screen.getByRole('alert')).toHaveTextContent(/account temporarily locked/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
