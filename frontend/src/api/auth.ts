const API_BASE = '/api/auth';

export interface LoginRequest {
  username: string;
  password: string;
  selectedRole: string;
}

export interface LoginResponse {
  sessionToken: string;
  redirectUrl: string;
  role: string;
}

export interface ApiError {
  detail: string;
  remainingSeconds?: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
  const err: ApiError = await res.json().catch(() => ({ detail: 'An unexpected error occurred.' }));
  const error = new Error(err.detail) as Error & { status: number; remainingSeconds?: number };
  error.status = res.status;
  error.remainingSeconds = err.remainingSeconds;
  throw error;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<LoginResponse>(res);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<void>(res);
}

export async function extendSession(): Promise<void> {
  const res = await fetch(`${API_BASE}/session/extend`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<void>(res);
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  return handleResponse<void>(res);
}

export async function verifyOtp(data: { email: string; otp: string }): Promise<{ resetToken: string }> {
  const res = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<{ resetToken: string }>(res);
}

export async function resetPassword(data: { resetToken: string; newPassword: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<void>(res);
}
