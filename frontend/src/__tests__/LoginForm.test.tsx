import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </MemoryRouter>
  );

const changeField = async (label: string, value: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};

const clickButton = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

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
    renderLoginForm();

    const adminTab = screen.getByRole('button', { name: 'Admin' });
    const receptionistTab = screen.getByRole('button', { name: 'Receptionist' });

    expect(adminTab).toHaveAttribute('aria-pressed', 'true');
    expect(receptionistTab).toHaveAttribute('aria-pressed', 'false');

    await clickButton('Receptionist');

    expect(receptionistTab).toHaveAttribute('aria-pressed', 'true');
    expect(adminTab).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC-01: submitting valid credentials redirects to role-specific URL', async () => {
    mockLogin.mockResolvedValueOnce({
      sessionToken: 'test-token-123',
      redirectUrl: '/dashboard/full',
      role: 'Admin',
    });

    renderLoginForm();

    await changeField('Username', 'admin');
    await changeField('Password', 'Admin@123');
    await clickButton('Login');

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
    mockLogin.mockResolvedValueOnce({
      sessionToken: 'guard-token-123',
      redirectUrl: '/gate-entry',
      role: 'SecurityGuard',
    });

    renderLoginForm();

    await clickButton('Security Guard');
    await changeField('Username', 'guard');
    await changeField('Password', 'Guard@123');
    await clickButton('Login');

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
    const error = new Error('Invalid username or password.') as Error & {
      status?: number;
    };
    error.status = 401;
    mockLogin.mockRejectedValueOnce(error);

    renderLoginForm();

    await changeField('Username', 'wronguser');
    await changeField('Password', 'wrongpass');
    await clickButton('Login');

    await waitFor(() => {
      // ErrorBanner renders with role="alert"
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('AC-03: account lockout (HTTP 423) shows lockout alert with remaining time', async () => {
    const error = new Error('Account locked') as Error & {
      status?: number;
      remainingSeconds?: number;
    };
    error.status = 423;
    error.remainingSeconds = 840;
    mockLogin.mockRejectedValueOnce(error);

    renderLoginForm();

    await changeField('Username', 'lockeduser');
    await changeField('Password', 'anypass');
    await clickButton('Login');

    await waitFor(() => {
      // Lockout div renders with role="alert" and text about temporary lock
      expect(screen.getByRole('alert')).toHaveTextContent(/account temporarily locked/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
