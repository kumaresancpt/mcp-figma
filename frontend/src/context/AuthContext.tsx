import React, { createContext, useContext, useState } from 'react';

interface AuthUser {
  role: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  sessionToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const setAuth = (newUser: AuthUser, token: string) => {
    setUser(newUser);
    setSessionToken(token);
  };

  const clearAuth = () => {
    setUser(null);
    setSessionToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        setAuth,
        clearAuth,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
