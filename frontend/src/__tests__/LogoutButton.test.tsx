import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderLogoutButton = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    </MemoryRouter>
  );

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AC-07: renders a Logout button', () => {
    renderLogoutButton();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  test('AC-07: clicking Logout calls the logout API and redirects to /login', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    renderLogoutButton();

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  test('AC-07: logout clears auth and navigates to /login even when API call fails', async () => {
    mockLogout.mockRejectedValueOnce(new Error('Network error'));

    renderLogoutButton();

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    // Should still navigate even on error (logout is best-effort)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

});
