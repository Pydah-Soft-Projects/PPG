import { useState, useEffect } from 'react';
import { auditApi } from '../api/audit.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const toast = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditApi.list({ limit: 50 });
      setLogs(res.data || []);
    } catch (err) {
      toast.error('Failed to load audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Security & Operational Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable record of all administrative configuration actions, credential rotations, and provider operations.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          🔄 Refresh Log
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5">Client IP</th>
                <th className="px-6 py-3.5 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-700">{log.actorType}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        {log.actorId}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-700">{log.targetType}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        {log.targetId || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500 text-[11px]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <button
                          onClick={() => setSelectedMeta(log.metadata)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                        >
                          View JSON
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Viewer Modal */}
      {selectedMeta && (
        <Modal
          isOpen={Boolean(selectedMeta)}
          onClose={() => setSelectedMeta(null)}
          title="Audit Event Metadata"
        >
          <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto font-mono text-xs max-h-96">
            {JSON.stringify(selectedMeta, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
}

