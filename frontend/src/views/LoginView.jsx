import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth.api';

export function LoginView() {
  const { login } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
        toast.success(`Welcome back, ${username}!`);
      } else {
        await authApi.register({ username, email, password });
        toast.success('Admin registered successfully! Please log in.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/30 mb-4">
            P
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            {mode === 'login' ? 'Sign in to Gateway' : 'Setup Administrator'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'Pydah Payment Gateway Orchestration Console'
              : 'Create first administrator with Super Admin privileges'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. admin"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="admin@pydah.edu.in"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 mt-6"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Admin Account'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          {mode === 'login' ? (
            <button
              onClick={() => setMode('register')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              First time setup? Register Initial Super Admin
            </button>
          ) : (
            <button
              onClick={() => setMode('login')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Already configured? Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

