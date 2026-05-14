import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordForm from '../components/ResetPasswordForm';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
const mockResetPassword = authApi.resetPassword as jest.MockedFunction<
  typeof authApi.resetPassword
>;

const mockNavigate = jest.fn();
// useLocation must return the reset token that the component reads from location.state
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { resetToken: 'valid-reset-token' }, pathname: '/reset-password' }),
}));

const renderForm = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ResetPasswordForm />
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

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AC-10: renders New Password and Confirm Password inputs', () => {
    renderForm();
    // Labels: "New Password" for id="new-password", "Confirm Password" for id="confirm-password"
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  test('AC-10: submitting a weak password shows complexity validation error', async () => {
    const { container } = renderForm();

    await changeField('New Password', 'weak');
    await changeField('Confirm Password', 'weak');

    // Button is disabled when password is weak; submit the form directly to trigger handleSubmit
    const form = container.querySelector('form') as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => {
      // ErrorBanner renders with role="alert"
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Password does not meet the complexity requirements.'
      );
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  test('AC-10: valid password reset calls API with resetToken and navigates to /login', async () => {
    jest.useFakeTimers();
    mockResetPassword.mockResolvedValueOnce(undefined);

    renderForm();

    await changeField('New Password', 'NewPass@123');
    await changeField('Confirm Password', 'NewPass@123');
    // Button is enabled when password is valid and passwords match
    await clickButton('Reset Password');

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        resetToken: 'valid-reset-token',
        newPassword: 'NewPass@123',
      });
    });

    // navigate is wrapped in setTimeout(1500) — advance fake timers to trigger it
    act(() => {
      jest.runAllTimers();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });

    jest.useRealTimers();
  });
});
