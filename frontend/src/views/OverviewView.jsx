import { useState, useEffect } from 'react';
import { reportsApi } from '../api/reports.api';
import { Badge } from '../components/Badge';
import { useToast } from '../context/ToastContext';

export function OverviewView({ onSelectTransaction }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getOverview();
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load overview analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatPaise = (paise = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Loading orchestration metrics...
        </div>
      </div>
    );
  }

  const totals = stats?.totals || {};
  const counts = stats?.counts || {};

  return (
    <div className="space-y-8">
      {/* Top Banner / Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payment Performance</h2>
          <p className="text-xs text-slate-500">Live transaction metrics and provider settlements</p>
        </div>
        <button
          onClick={fetchStats}
          className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Volume</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatPaise(totals.succeededVolumePaise)}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">Authorized & Succeeded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refunded Total</div>
          <div className="text-2xl font-black text-purple-700 mt-2">
            {formatPaise(totals.refundedPaise)}
          </div>
          <div className="text-xs text-purple-600 font-semibold mt-1">
            {counts.refunded || 0} refunds processed
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Activity</div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {formatPaise(totals.netVolumePaise)}
          </div>
          <div className="text-xs text-indigo-500 font-semibold mt-1">Gross minus refunds</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Success Rate</div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {counts.succeeded + counts.failed > 0
              ? `${Math.round((counts.succeeded / (counts.succeeded + counts.failed)) * 100)}%`
              : '100%'}
          </div>
          <div className="text-xs text-slate-400 font-semibold mt-1">
            {counts.succeeded || 0} Succeeded / {counts.failed || 0} Failed
          </div>
        </div>
      </div>

      {/* Transaction Status Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl">
          <div className="text-xs font-bold text-emerald-800">Succeeded</div>
          <div className="text-xl font-black text-emerald-900 mt-1">{counts.succeeded || 0}</div>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl">
          <div className="text-xs font-bold text-amber-800">Pending Checkout</div>
          <div className="text-xl font-black text-amber-900 mt-1">{counts.pending || 0}</div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200/80 p-4 rounded-xl">
          <div className="text-xs font-bold text-rose-800">Failed Attempts</div>
          <div className="text-xl font-black text-rose-900 mt-1">{counts.failed || 0}</div>
        </div>
        <div className="bg-slate-100/60 border border-slate-200/80 p-4 rounded-xl">
          <div className="text-xs font-bold text-slate-700">Orders Created</div>
          <div className="text-xl font-black text-slate-900 mt-1">{counts.created || 0}</div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Transactions</h3>
          <span className="text-xs text-slate-400">Latest 10 payments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Payment ID</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Provider Order</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentTransactions?.length > 0 ? (
                stats.recentTransactions.map((tx) => (
                  <tr
                    key={tx._id}
                    onClick={() => onSelectTransaction?.(tx)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5 font-mono text-indigo-600 font-semibold">
                      {tx._id}
                    </td>
                    <td className="px-6 py-3.5 text-slate-800 font-medium">
                      {tx.businessReference}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {formatPaise(tx.amount)}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={tx.status} />
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">
                      {tx.providerOrderId || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No transactions recorded yet. Create a payment from your application backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

