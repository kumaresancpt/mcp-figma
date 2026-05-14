import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SessionWarningModal from '../components/SessionWarningModal';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
const mockExtendSession = authApi.extendSession as jest.MockedFunction<typeof authApi.extendSession>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderModal = (isVisible: boolean, onClose = jest.fn(), minutesRemaining = 5) =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <SessionWarningModal
          isVisible={isVisible}
          onClose={onClose}
          minutesRemaining={minutesRemaining}
        />
      </AuthProvider>
    </MemoryRouter>
  );

describe('SessionWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AC-06: renders warning modal with heading and Extend Session button when visible', () => {
    renderModal(true);
    // h2 text
    expect(screen.getByRole('heading', { name: 'Session Expiring Soon' })).toBeInTheDocument();
    // Extend and Logout buttons
    expect(screen.getByRole('button', { name: 'Extend Session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  test('AC-06: clicking Extend Session calls extendSession API and closes the modal', async () => {
    mockExtendSession.mockResolvedValueOnce(undefined);
    const onClose = jest.fn();

    renderModal(true, onClose, 5);

    await userEvent.click(screen.getByRole('button', { name: 'Extend Session' }));

    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
    // Should NOT navigate away when extension succeeds
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('AC-06: modal renders nothing when isVisible is false', () => {
    renderModal(false);
    // Component returns null when !isVisible
    expect(screen.queryByRole('heading', { name: 'Session Expiring Soon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Extend Session' })).not.toBeInTheDocument();
  });

  test('AC-06: clicking Logout calls logout API and navigates to /login', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    renderModal(true);

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
