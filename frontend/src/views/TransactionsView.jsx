import { useState, useEffect } from 'react';
import { transactionsApi } from '../api/transactions.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function TransactionsView({ selectedTx, setSelectedTx }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeModalTx, setActiveModalTx] = useState(selectedTx || null);
  const [syncing, setSyncing] = useState(false);

  const toast = useToast();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await transactionsApi.list(params);
      setTransactions(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleSyncWithProvider = async (txId) => {
    try {
      setSyncing(true);
      const res = await transactionsApi.sync(txId);
      toast.success(
        res.data.synced
          ? `Synced successfully! Status: ${res.data.newStatus}`
          : res.data.message
      );
      if (res.data?.payment) {
        setActiveModalTx(res.data.payment);
      }
      fetchTransactions();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
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
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Payment ID, reference, customer..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="PENDING">PENDING</option>
            <option value="CREATED">CREATED</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
          </select>
          <button
            onClick={fetchTransactions}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Payment ID</th>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Business Ref</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Provider Order</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setActiveModalTx(tx)}
                  >
                    <td className="px-6 py-3.5 font-mono text-indigo-600 font-semibold">
                      {tx._id}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                      {tx.applicationId}
                    </td>
                    <td className="px-6 py-3.5 text-slate-800 font-semibold">
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
                      {new Date(tx.createdAt).toLocaleDateString()}{' '}
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveModalTx(tx)}
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No transactions match your current query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {activeModalTx && (
        <Modal
          isOpen={Boolean(activeModalTx)}
          onClose={() => setActiveModalTx(null)}
          title={`Payment Details: ${activeModalTx._id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Status Header */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={activeModalTx.status} />
                  <span className="font-bold text-slate-900 text-base">
                    {formatPaise(activeModalTx.amount)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleSyncWithProvider(activeModalTx._id)}
                disabled={syncing}
                className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg shadow-2xs transition-colors"
              >
                {syncing ? 'Syncing...' : '🔄 Sync with Provider'}
              </button>
            </div>

            {/* Key Value Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Business Reference</div>
                <div className="font-semibold text-slate-900 text-sm mt-0.5">{activeModalTx.businessReference}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Application ID</div>
                <div className="font-mono text-slate-800 text-xs mt-0.5">{activeModalTx.applicationId}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Provider Order ID</div>
                <div className="font-mono text-slate-800 text-xs mt-0.5">{activeModalTx.providerOrderId || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Provider Payment ID</div>
                <div className="font-mono text-slate-800 text-xs mt-0.5">{activeModalTx.providerPaymentId || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Refunded Amount</div>
                <div className="font-bold text-purple-700 text-xs mt-0.5">
                  {formatPaise(activeModalTx.refundedAmount || 0)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Idempotency Key</div>
                <div className="font-mono text-slate-600 text-xs mt-0.5 truncate">{activeModalTx.idempotencyKey}</div>
              </div>
            </div>

            {/* Customer Details */}
            {activeModalTx.customer && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase text-[10px] mb-2">Customer Prefill</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-400">Name:</span> <span className="font-medium">{activeModalTx.customer.name || '—'}</span></div>
                  <div><span className="text-slate-400">Email:</span> <span className="font-medium">{activeModalTx.customer.email || '—'}</span></div>
                  <div><span className="text-slate-400">Phone:</span> <span className="font-medium">{activeModalTx.customer.phone || '—'}</span></div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-100">
              <div>Created: {new Date(activeModalTx.createdAt).toLocaleString()}</div>
              {activeModalTx.paidAt && (
                <div className="text-emerald-600 font-medium">
                  Paid: {new Date(activeModalTx.paidAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

