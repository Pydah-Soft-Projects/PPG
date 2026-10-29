import { useState, useEffect } from 'react';
import { reconciliationApi } from '../api/reconciliation.api';
import { Badge } from '../components/Badge';
import { useToast } from '../context/ToastContext';

export function ReconciliationView() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const toast = useToast();

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await reconciliationApi.getExceptions();
      setExceptions(res.data?.exceptions || []);
    } catch (err) {
      toast.error('Failed to load reconciliation exceptions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleSync = async (paymentId) => {
    try {
      setSyncingId(paymentId);
      const res = await reconciliationApi.sync(paymentId);
      if (res.data?.synced) {
        toast.success(
          `Payment resolved! Status changed from ${res.data.oldStatus} to ${res.data.newStatus}`
        );
      } else {
        toast.info(res.data?.message || 'Payment state checked; still pending at provider');
      }
      fetchExceptions();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const formatPaise = (paise = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reconciliation & Status Recovery</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify ambiguous or stalled transactions older than 15 minutes and query the provider for authoritative outcomes.
          </p>
        </div>
        <button
          onClick={fetchExceptions}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          🔄 Refresh Exceptions
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Payment ID</th>
                <th className="px-6 py-3.5">Business Reference</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Current Status</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5">Provider Reference</th>
                <th className="px-6 py-3.5 text-right">Recovery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Scanning for ambiguous transactions...
                  </td>
                </tr>
              ) : exceptions.length > 0 ? (
                exceptions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/80 transition-colors">
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
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">
                      {tx.providerPaymentId || tx.providerOrderId || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleSync(tx._id)}
                        disabled={syncingId === tx._id}
                        className="px-3 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {syncingId === tx._id ? 'Querying...' : 'Sync with Provider'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <div className="text-2xl mb-1">🎉</div>
                    <div className="font-semibold text-slate-700">No reconciliation exceptions!</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      All transaction states are fully settled and synchronized.
                    </div>
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

