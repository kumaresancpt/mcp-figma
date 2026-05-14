import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
const mockForgotPassword = authApi.forgotPassword as jest.MockedFunction<
  typeof authApi.forgotPassword
>;
const mockVerifyOtp = authApi.verifyOtp as jest.MockedFunction<typeof authApi.verifyOtp>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderForm = () =>
  render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>
  );

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AC-09: submitting email calls forgotPassword API and shows OTP step', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderForm();

    // Step 1: email — label "Email Address" for id="fp-email"
    await user.type(screen.getByLabelText('Email Address'), 'test@vms.local');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@vms.local');
    });

    // Component should transition to OTP step
    await waitFor(() => {
      expect(screen.getByLabelText('Enter OTP')).toBeInTheDocument();
    });
  });

  test('AC-09: OTP verification success navigates to /reset-password with resetToken', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    mockVerifyOtp.mockResolvedValueOnce({ resetToken: 'reset-token-abc' });
    const user = userEvent.setup();

    renderForm();

    // Step 1: submit email
    await user.type(screen.getByLabelText('Email Address'), 'test@vms.local');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalled());

    // Step 2: OTP input appears — label "Enter OTP" for id="otp-input"
    // Use fireEvent.change for OTP to avoid act() issues with the digit-only filter
    await waitFor(() => expect(screen.getByLabelText('Enter OTP')).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Enter OTP'), { target: { value: '123456' } });
    });
    await user.click(screen.getByRole('button', { name: 'Verify OTP' }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'test@vms.local', otp: '123456' });
      expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
        state: { resetToken: 'reset-token-abc' },
        replace: true,
      });
    });
  });

  test('AC-09: failed OTP attempt shows error with remaining attempts count', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    const error = new Error('Invalid OTP') as Error & { status?: number };
    mockVerifyOtp.mockRejectedValueOnce(error);
    const user = userEvent.setup();

    renderForm();

    // Step 1: submit email
    await user.type(screen.getByLabelText('Email Address'), 'test@vms.local');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalled());

    // Step 2: submit wrong OTP using fireEvent.change for OTP digit filtering
    await waitFor(() => expect(screen.getByLabelText('Enter OTP')).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Enter OTP'), { target: { value: '999999' } });
    });
    await user.click(screen.getByRole('button', { name: 'Verify OTP' }));

    await waitFor(() => {
      // ErrorBanner renders with role="alert"; message includes "Invalid OTP" + "2 attempts remaining"
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid otp/i);
      expect(screen.getByRole('alert')).toHaveTextContent(/attempts remaining/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
