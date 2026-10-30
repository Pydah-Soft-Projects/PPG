import { useAuth } from '../context/AuthContext';

export function Navbar({ title }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          TEST MODE
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {user.username}
              </div>
              <div className="text-xs font-medium text-slate-500">{user.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors ml-2"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

