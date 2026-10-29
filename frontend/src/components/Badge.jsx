export function Badge({ status, label }) {
  const text = label || status || 'UNKNOWN';
  const s = String(status).toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s === 'SUCCEEDED' || s === 'ACTIVE' || s === 'DELIVERED') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'PENDING' || s === 'CREATED' || s === 'AUTHORIZED') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'FAILED' || s === 'CANCELLED' || s === 'REVOKED' || s === 'INACTIVE') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s === 'REFUNDED' || s === 'PARTIALLY_REFUNDED' || s === 'REFUND_PENDING') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (s === 'TEST') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (s === 'LIVE') {
    styles = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      {text}
    </span>
  );
}

