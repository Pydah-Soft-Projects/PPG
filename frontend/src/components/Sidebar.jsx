export function Sidebar({ currentTab, setTab }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'providers', label: 'Payment Accounts', icon: '💳' },
    { id: 'colleges', label: 'Colleges & Routing', icon: '🏛️' },
    { id: 'applications', label: 'Applications', icon: '📱' },
    { id: 'refunds', label: 'Refunds', icon: '↩️' },
    { id: 'reconciliation', label: 'Reconciliation', icon: '⚖️' },
    { id: 'audit', label: 'Audit Logs', icon: '🛡️' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
          P
        </div>
        <div>
          <div className="text-white font-bold text-base leading-tight tracking-wide">Pydah Gateway</div>
          <div className="text-slate-400 text-xs font-medium">Orchestration Hub</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Provider Adapter</span>
          <span className="text-emerald-400 font-semibold">Razorpay Ready</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">PydahSoft Ecosystem v1.0</div>
      </div>
    </aside>
  );
}

