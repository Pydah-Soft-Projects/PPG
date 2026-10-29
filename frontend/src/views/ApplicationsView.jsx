import { useState, useEffect } from 'react';
import { applicationsApi } from '../api/applications.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function ApplicationsView() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedCreds, setRevealedCreds] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    notificationWebhookUrl: '',
    allowedReturnUrls: '',
  });

  const toast = useToast();

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await applicationsApi.list();
      setApps(res.data || []);
    } catch (err) {
      toast.error('Failed to load applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: createForm.name,
        code: createForm.code,
        description: createForm.description,
        notificationWebhookUrl: createForm.notificationWebhookUrl || undefined,
        allowedReturnUrls: createForm.allowedReturnUrls
          ? createForm.allowedReturnUrls.split('\n').filter(Boolean)
          : [],
      };

      const res = await applicationsApi.create(payload);
      toast.success('Application registered successfully!');
      setShowCreateModal(false);
      setRevealedCreds({
        appName: res.data.application.name,
        keyId: res.data.credentials.keyId,
        secret: res.data.credentials.secret,
      });
      setCreateForm({
        name: '',
        code: '',
        description: '',
        notificationWebhookUrl: '',
        allowedReturnUrls: '',
      });
      fetchApps();
    } catch (err) {
      toast.error('Registration failed: ' + err.message);
    }
  };

  const handleRotateCredentials = async (app) => {
    if (
      !window.confirm(
        `Are you sure you want to rotate credentials for ${app.name}? The previous secret will immediately cease to work.`
      )
    ) {
      return;
    }

    try {
      const res = await applicationsApi.rotateCredentials(app._id);
      toast.success('Credentials rotated successfully!');
      setRevealedCreds({
        appName: app.name,
        keyId: res.data.keyId,
        secret: res.data.secret,
      });
      fetchApps();
    } catch (err) {
      toast.error('Rotation failed: ' + err.message);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Registered Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage PydahSoft applications authorized to initiate server-to-server payments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
        >
          + Register Application
        </button>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Active Key ID</th>
                <th className="px-6 py-3.5">Notification Webhook</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading registered applications...
                  </td>
                </tr>
              ) : apps.length > 0 ? (
                apps.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{app.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {app._id}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700 font-medium">
                      {app.code}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-indigo-600 font-semibold">
                      {app.activeCredential?.keyId || 'No active key'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                      {app.notificationWebhookUrl || 'Not configured'}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={app.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleRotateCredentials(app)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200"
                      >
                        Rotate Secret
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No applications registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Application Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New PydahSoft Application"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Application Name
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Pydah Learning Management System"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Application Code (Slug)
            </label>
            <input
              type="text"
              required
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              placeholder="e.g. pydah_lms"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Brief purpose of application"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notification Webhook URL (Application Backend)
            </label>
            <input
              type="url"
              value={createForm.notificationWebhookUrl}
              onChange={(e) => setCreateForm({ ...createForm, notificationWebhookUrl: e.target.value })}
              placeholder="https://app.pydah.edu.in/api/webhooks/payment"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Allowed Return URLs (One per line)
            </label>
            <textarea
              rows={2}
              value={createForm.allowedReturnUrls}
              onChange={(e) => setCreateForm({ ...createForm, allowedReturnUrls: e.target.value })}
              placeholder="https://app.pydah.edu.in/checkout/success"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
            >
              Register & Generate Keys
            </button>
          </div>
        </form>
      </Modal>

      {/* One-Time Credential Reveal Modal */}
      {revealedCreds && (
        <Modal
          isOpen={Boolean(revealedCreds)}
          onClose={() => setRevealedCreds(null)}
          title="⚠️ New Application Credentials"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium">
              Important: Store the Secret Key immediately in a safe location (e.g. backend .env). For
              security, this secret is hashed and can <strong>never</strong> be displayed again.
            </div>

            <div className="space-y-3 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-sans font-bold">
                  Header: X-App-Key
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-emerald-400 select-all">{revealedCreds.keyId}</span>
                  <button
                    onClick={() => copyToClipboard(revealedCreds.keyId, 'Key ID')}
                    className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-sans"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-sans font-bold">
                  Header: X-App-Secret
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-amber-400 select-all">{revealedCreds.secret}</span>
                  <button
                    onClick={() => copyToClipboard(revealedCreds.secret, 'Secret Key')}
                    className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-sans"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setRevealedCreds(null)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                I Have Safely Saved These Credentials
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

