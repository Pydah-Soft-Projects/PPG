import { useState, useEffect } from 'react';
import { providersApi } from '../api/providers.api';
import { applicationsApi } from '../api/applications.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function ProvidersView() {
  const [configs, setConfigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Forms state
  const [addForm, setAddForm] = useState({
    name: '',
    provider: 'RAZORPAY',
    environment: 'TEST',
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    notes: '',
  });

  const [rotateForm, setRotateForm] = useState({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
  });

  const [selectedAppIds, setSelectedAppIds] = useState([]);

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [provRes, appRes] = await Promise.all([
        providersApi.list(),
        applicationsApi.list(),
      ]);
      setConfigs(provRes.data || []);
      setApplications(appRes.data || []);
    } catch (err) {
      toast.error('Failed to load provider configurations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await providersApi.create(addForm);
      toast.success('Provider configuration created successfully!');
      setShowAddModal(false);
      setAddForm({
        name: '',
        provider: 'RAZORPAY',
        environment: 'TEST',
        keyId: '',
        keySecret: '',
        webhookSecret: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      toast.error('Creation failed: ' + err.message);
    }
  };

  const handleRotateSubmit = async (e) => {
    e.preventDefault();
    try {
      await providersApi.rotateCredentials(selectedConfig.id, rotateForm);
      toast.success('Credentials rotated successfully!');
      setShowRotateModal(false);
      setRotateForm({ keyId: '', keySecret: '', webhookSecret: '' });
      loadData();
    } catch (err) {
      toast.error('Rotation failed: ' + err.message);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await providersApi.assignApplications(selectedConfig.id, selectedAppIds);
      toast.success('Application assignments saved!');
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      toast.error('Assignment failed: ' + err.message);
    }
  };

  const handleTestConnection = async (config) => {
    try {
      setTestingId(config.id);
      const res = await providersApi.testConnection(config.id);
      if (res.success) {
        toast.success(`Connection Test Passed: ${res.message}`);
      } else {
        toast.error(`Connection Test Failed: ${res.message}`);
      }
    } catch (err) {
      toast.error('Connection test error: ' + err.message);
    } finally {
      setTestingId(null);
    }
  };

  const copyWebhookUrl = (configId) => {
    const origin = window.location.origin;
    const url = `${origin}/api/v1/webhooks/razorpay/${configId}`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook endpoint URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header & New Config Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Payment Provider Configurations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Razorpay accounts, environment selection, credential encryption, and app mapping.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
        >
          + Add Provider Configuration
        </button>
      </div>

      {/* Provider Configurations Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">
          Loading provider credentials and assignments...
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-3xl mb-2">⚙️</div>
          <div className="text-sm font-bold text-slate-700">No payment providers configured</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add a Razorpay Test Mode account to begin processing transactions securely.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Configure Razorpay Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between"
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{cfg.name}</h3>
                      <Badge status={cfg.environment} />
                      <Badge status={cfg.status} />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {cfg.id}</div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {cfg.provider}
                  </span>
                </div>

                {/* Key Details */}
                <div className="mt-4 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Public Key ID:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {cfg.maskedKeyId || '****'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Key Secret Status:</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      🔒 AES-256-GCM Encrypted
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Webhook Secret:</span>
                    <span className="font-semibold text-slate-700">
                      {cfg.hasWebhookSecret ? 'Configured (Encrypted)' : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Assigned Applications:</span>
                    <span className="font-semibold text-indigo-600">
                      {cfg.allowedApplicationIds?.length === 0
                        ? 'All Applications'
                        : `${cfg.allowedApplicationIds.length} application(s)`}
                    </span>
                  </div>
                </div>

                {/* Webhook Endpoint Info */}
                <div className="mt-3 bg-slate-900 text-slate-200 p-3 rounded-xl text-xs font-mono">
                  <div className="text-[10px] text-slate-400 font-sans font-bold uppercase mb-1">
                    Razorpay Webhook URL:
                  </div>
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate text-slate-300 text-[11px]">
                      /api/v1/webhooks/razorpay/{cfg.id}
                    </span>
                    <button
                      onClick={() => copyWebhookUrl(cfg.id)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded shrink-0 font-sans font-medium"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(cfg)}
                  disabled={testingId === cfg.id}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {testingId === cfg.id ? 'Testing...' : '⚡ Test Connection'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedConfig(cfg);
                      setSelectedAppIds(cfg.allowedApplicationIds || []);
                      setShowAssignModal(true);
                    }}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Assign Apps
                  </button>
                  <button
                    onClick={() => {
                      setSelectedConfig(cfg);
                      setRotateForm({ keyId: cfg.keyId, keySecret: '', webhookSecret: '' });
                      setShowRotateModal(true);
                    }}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold"
                  >
                    Rotate Keys
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Payment Provider Configuration"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Configuration Display Name
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Razorpay - Main College Account"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Provider Type
              </label>
              <select
                value={addForm.provider}
                onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="RAZORPAY">Razorpay</option>
                <option value="MOCK">Mock Provider (Testing)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Environment
              </label>
              <select
                value={addForm.environment}
                onChange={(e) => setAddForm({ ...addForm, environment: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="TEST">TEST Mode (Recommended)</option>
                <option value="LIVE">LIVE Mode (Requires authorization)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Razorpay Key ID
            </label>
            <input
              type="text"
              required
              value={addForm.keyId}
              onChange={(e) => setAddForm({ ...addForm, keyId: e.target.value })}
              placeholder="rzp_test_..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Razorpay Key Secret
            </label>
            <input
              type="password"
              required
              value={addForm.keySecret}
              onChange={(e) => setAddForm({ ...addForm, keySecret: e.target.value })}
              placeholder="••••••••••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Secret is immediately encrypted with AES-256-GCM and never returned by the API.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Razorpay Webhook Secret (Optional)
            </label>
            <input
              type="password"
              value={addForm.webhookSecret}
              onChange={(e) => setAddForm({ ...addForm, webhookSecret: e.target.value })}
              placeholder="Secret configured in Razorpay Dashboard webhooks"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Operational Notes
            </label>
            <textarea
              rows={2}
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="Notes on usage or banking accounts"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Rotate Credentials Modal */}
      {selectedConfig && (
        <Modal
          isOpen={showRotateModal}
          onClose={() => setShowRotateModal(false)}
          title={`Rotate Credentials: ${selectedConfig.name}`}
        >
          <form onSubmit={handleRotateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Key ID (Leave empty to keep existing)
              </label>
              <input
                type="text"
                value={rotateForm.keyId}
                onChange={(e) => setRotateForm({ ...rotateForm, keyId: e.target.value })}
                placeholder={selectedConfig.maskedKeyId}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Key Secret
              </label>
              <input
                type="password"
                required
                value={rotateForm.keySecret}
                onChange={(e) => setRotateForm({ ...rotateForm, keySecret: e.target.value })}
                placeholder="Enter new secret"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Webhook Secret (Optional)
              </label>
              <input
                type="password"
                value={rotateForm.webhookSecret}
                onChange={(e) => setRotateForm({ ...rotateForm, webhookSecret: e.target.value })}
                placeholder="Enter replacement webhook secret"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20"
              >
                Confirm Rotation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Applications Modal */}
      {selectedConfig && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title={`Assign Applications to ${selectedConfig.name}`}
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Select which registered PydahSoft applications are permitted to route payments through this provider account:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 p-3 rounded-xl">
              {applications.map((app) => {
                const isChecked = selectedAppIds.includes(app._id);
                return (
                  <label
                    key={app._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAppIds([...selectedAppIds, app._id]);
                        } else {
                          setSelectedAppIds(selectedAppIds.filter((id) => id !== app._id));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">{app.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">code: {app.code}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
              >
                Save Assignments
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

