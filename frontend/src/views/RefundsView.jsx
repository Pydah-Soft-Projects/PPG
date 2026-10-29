import { useState, useEffect } from 'react';
import { refundsApi } from '../api/refunds.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function RefundsView() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    paymentId: '',
    rupees: '',
    reason: '',
  });

  const toast = useToast();

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await refundsApi.list();
      setRefunds(res.data || []);
    } catch (err) {
      toast.error('Failed to load refunds: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    try {
      const rupeesVal = parseFloat(form.rupees);
      if (isNaN(rupeesVal) || rupeesVal <= 0) {
        toast.error('Please enter a valid positive refund amount');
        return;
      }

      const paiseAmount = Math.round(rupeesVal * 100);

      await refundsApi.create({
        paymentId: form.paymentId.trim(),
        amount: paiseAmount,
        reason: form.reason,
      });

      toast.success('Refund requested successfully!');
      setShowModal(false);
      setForm({ paymentId: '', rupees: '', reason: '' });
      fetchRefunds();
    } catch (err) {
      toast.error('Refund failed: ' + err.message);
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
          <h2 className="text-lg font-bold text-slate-900">Refunds Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit refund records and process administrative refunds against settled transactions.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
        >
          + Initiate Refund
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Refund ID</th>
                <th className="px-6 py-3.5">Payment ID</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Provider Refund ID</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Loading refunds...
                  </td>
                </tr>
              ) : refunds.length > 0 ? (
                refunds.map((rf) => (
                  <tr key={rf._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-purple-700 font-semibold">
                      {rf._id}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-indigo-600">
                      {rf.paymentId}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {formatPaise(rf.amount)}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={rf.status} />
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">
                      {rf.providerRefundId || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {rf.reason || 'No reason provided'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(rf.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No refunds issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Refund Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Process Refund Against Payment"
      >
        <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Internal Payment ID
            </label>
            <input
              type="text"
              required
              value={form.paymentId}
              onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
              placeholder="pay_..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Refund Amount (Rupees ₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.rupees}
              onChange={(e) => setForm({ ...form, rupees: e.target.value })}
              placeholder="e.g. 1500"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Refund
            </label>
            <textarea
              rows={2}
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Student course fee adjustment"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-md shadow-purple-700/20"
            >
              Confirm Refund
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

