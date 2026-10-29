import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ppg_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ppg_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.getMe();
        if (res?.data) {
          setUser(res.data);
          localStorage.setItem('ppg_admin_user', JSON.stringify(res.data));
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifySession();

    const handleAuthExpired = () => logout();
    window.addEventListener('ppg:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('ppg:auth_expired', handleAuthExpired);
  }, [token]);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('ppg_admin_token', newToken);
    localStorage.setItem('ppg_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('ppg_admin_token');
    localStorage.removeItem('ppg_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

