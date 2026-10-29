import { useState, useEffect } from 'react';
import { providersApi } from '../api/providers.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function ProvidersView() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Create Form state
  const [addForm, setAddForm] = useState({
    name: '',
    accountNumber: '',
    provider: 'RAZORPAY',
    environment: 'TEST',
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    notes: '',
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    accountNumber: '',
    status: 'ACTIVE',
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    notes: '',
  });

  // Rotate Form state
  const [rotateForm, setRotateForm] = useState({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
  });

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const provRes = await providersApi.list();
      setConfigs(provRes.data || []);
    } catch (err) {
      toast.error('Failed to load payment accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Please provide an Account Name.');
      return;
    }
    if (!addForm.keyId.trim() || !addForm.keySecret.trim()) {
      toast.error('Please enter the required API Keys/Credentials.');
      return;
    }

    try {
      await providersApi.create(addForm);
      toast.success('Payment account created successfully!');
      setShowAddModal(false);
      setAddForm({
        name: '',
        accountNumber: '',
        provider: 'RAZORPAY',
        environment: 'TEST',
        keyId: '',
        keySecret: '',
        webhookSecret: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      toast.error('Account creation failed: ' + err.message);
    }
  };

  const openEditModal = (config) => {
    setSelectedConfig(config);
    setEditForm({
      name: config.name || '',
      accountNumber: config.accountNumber || '',
      status: config.status || 'ACTIVE',
      keyId: config.keyId || '',
      keySecret: '',
      webhookSecret: '',
      notes: config.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Account Name cannot be empty.');
      return;
    }

    try {
      const payload = {
        name: editForm.name.trim(),
        accountNumber: editForm.accountNumber.trim(),
        status: editForm.status,
        notes: editForm.notes.trim(),
      };

      if (editForm.keyId && editForm.keyId.trim()) {
        payload.keyId = editForm.keyId.trim();
      }
      if (editForm.keySecret && editForm.keySecret.trim()) {
        payload.keySecret = editForm.keySecret.trim();
      }
      if (editForm.webhookSecret && editForm.webhookSecret.trim()) {
        payload.webhookSecret = editForm.webhookSecret.trim();
      }

      await providersApi.update(selectedConfig.id, payload);
      toast.success('Payment account updated successfully!');
      setShowEditModal(false);
      loadData();
    } catch (err) {
      toast.error('Update failed: ' + err.message);
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

  const getWebhookUrl = (configId, provider) => {
    const backendBase =
      import.meta.env.VITE_BACKEND_URL ||
      (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin);
    return `${backendBase}/api/v1/webhooks/${provider.toLowerCase()}/${configId}`;
  };

  const copyWebhookUrl = (configId, provider) => {
    const url = getWebhookUrl(configId, provider);
    navigator.clipboard.writeText(url);
    toast.success('Webhook endpoint URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Account Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Payment Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage gateway accounts, credentials encryption, merchant IDs, and live/test environments.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
        >
          + Add Account
        </button>
      </div>

      {/* Payment Accounts Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">
          Loading payment accounts...
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-3xl mb-2">💳</div>
          <div className="text-sm font-bold text-slate-700">No payment accounts configured</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add a Razorpay or Cashfree account to begin receiving student fee transactions.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Add Account Now
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
                    {cfg.accountNumber && (
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        A/C No: <span className="font-mono text-indigo-700">{cfg.accountNumber}</span>
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {cfg.id}</div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {cfg.provider}
                  </span>
                </div>

                {/* Key Details */}
                <div className="mt-4 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {cfg.provider === 'CASHFREE' ? 'App / Client ID:' : 'Public Key ID:'}
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {cfg.maskedKeyId || '****'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Secret Key Status:</span>
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
                  {cfg.notes && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Notes:</span>
                      <span className="text-slate-600 truncate max-w-[200px]">{cfg.notes}</span>
                    </div>
                  )}
                </div>

                {/* Webhook Endpoint Info */}
                <div className="mt-3 bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs font-mono">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] text-slate-400 font-sans font-bold uppercase">
                      {cfg.provider} Webhook Endpoint:
                    </span>
                    <button
                      onClick={() => copyWebhookUrl(cfg.id, cfg.provider)}
                      className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded shrink-0 font-sans font-semibold transition-colors"
                    >
                      📋 Copy Full URL
                    </button>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg text-emerald-400 text-[11px] font-mono break-all select-all border border-slate-800">
                    {getWebhookUrl(cfg.id, cfg.provider)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-2">
                    Paste into <strong>{cfg.provider} Dashboard &rarr; Settings &rarr; Webhooks</strong> (select events: <code>payment.captured</code>, <code>payment.failed</code>).
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(cfg)}
                  disabled={testingId === cfg.id}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {testingId === cfg.id ? 'Testing...' : '⚡ Test Connection'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(cfg)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    ✏️ Edit Account
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

      {/* Add Account Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* 1. Account Name */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Pydah Engineering Fee Collection Account"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* 2. Account Number */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Number / Bank Ref (Optional)
            </label>
            <input
              type="text"
              value={addForm.accountNumber}
              onChange={(e) => setAddForm({ ...addForm, accountNumber: e.target.value })}
              placeholder="e.g. ACC-PYDAH-001 or 9180200388271"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
            />
          </div>

          {/* 3. Provider Type & Environment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Provider Type *
              </label>
              <select
                value={addForm.provider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setAddForm({
                    ...addForm,
                    provider: newProvider,
                    keyId: '',
                    keySecret: '',
                    webhookSecret: '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="RAZORPAY">Razorpay</option>
                <option value="CASHFREE">Cashfree Payments</option>
                <option value="MOCK">Mock Provider (Testing)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Environment *
              </label>
              <select
                value={addForm.environment}
                onChange={(e) => setAddForm({ ...addForm, environment: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="TEST">TEST Mode (Recommended)</option>
                <option value="LIVE">LIVE Mode (Production)</option>
              </select>
            </div>
          </div>

          {/* 4. Dynamic Provider Credentials based on Provider Type */}
          {addForm.provider === 'RAZORPAY' && (
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="text-[11px] font-bold text-blue-900 uppercase">Razorpay Credentials</div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Razorpay Key ID *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.keyId}
                  onChange={(e) => setAddForm({ ...addForm, keyId: e.target.value })}
                  placeholder="rzp_test_..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Razorpay Key Secret *
                </label>
                <input
                  type="password"
                  required
                  value={addForm.keySecret}
                  onChange={(e) => setAddForm({ ...addForm, keySecret: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Razorpay Webhook Secret (Optional)
                </label>
                <input
                  type="password"
                  value={addForm.webhookSecret}
                  onChange={(e) => setAddForm({ ...addForm, webhookSecret: e.target.value })}
                  placeholder="Secret configured in Razorpay webhooks"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>
            </div>
          )}

          {addForm.provider === 'CASHFREE' && (
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
              <div className="text-[11px] font-bold text-purple-900 uppercase">Cashfree Credentials</div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cashfree App ID / Client ID *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.keyId}
                  onChange={(e) => setAddForm({ ...addForm, keyId: e.target.value })}
                  placeholder="e.g. CF123456TEST..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cashfree Secret Key *
                </label>
                <input
                  type="password"
                  required
                  value={addForm.keySecret}
                  onChange={(e) => setAddForm({ ...addForm, keySecret: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cashfree Webhook / API Version (Optional)
                </label>
                <input
                  type="text"
                  value={addForm.webhookSecret}
                  onChange={(e) => setAddForm({ ...addForm, webhookSecret: e.target.value })}
                  placeholder="e.g. 2023-08-01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>
            </div>
          )}

          {addForm.provider === 'MOCK' && (
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
              <div className="text-[11px] font-bold text-emerald-900 uppercase">Mock Provider Configuration</div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mock Key / Merchant Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.keyId}
                  onChange={(e) => setAddForm({ ...addForm, keyId: e.target.value })}
                  placeholder="mock_sandbox_key_01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mock Secret Key *
                </label>
                <input
                  type="password"
                  required
                  value={addForm.keySecret}
                  onChange={(e) => setAddForm({ ...addForm, keySecret: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>
            </div>
          )}

          {/* Operational Notes */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Operational Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="Notes on usage or banking branch"
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
            >
              Save Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Account Modal */}
      {selectedConfig && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Account: ${selectedConfig.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            {/* Account Name */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Number / Bank Ref
              </label>
              <input
                type="text"
                value={editForm.accountNumber}
                onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                placeholder="e.g. ACC-PYDAH-001"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="ACTIVE">ACTIVE (Receiving Transactions)</option>
                <option value="INACTIVE">INACTIVE (Disabled)</option>
              </select>
            </div>

            {/* Credentials Update (Optional) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-[11px] font-bold text-slate-700 uppercase">
                API Credentials (Optional Update)
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Public Key ID / Client ID
                </label>
                <input
                  type="text"
                  value={editForm.keyId}
                  onChange={(e) => setEditForm({ ...editForm, keyId: e.target.value })}
                  placeholder={selectedConfig.maskedKeyId}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  New Key Secret
                </label>
                <input
                  type="password"
                  value={editForm.keySecret}
                  onChange={(e) => setEditForm({ ...editForm, keySecret: e.target.value })}
                  placeholder="Leave empty to keep current encrypted secret"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={editForm.webhookSecret}
                  onChange={(e) => setEditForm({ ...editForm, webhookSecret: e.target.value })}
                  placeholder="Leave empty to keep current webhook secret"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Operational Notes
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes or memos"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

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
                Key ID / Client ID (Leave empty to keep existing)
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
                New Key Secret *
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
    </div>
  );
}
