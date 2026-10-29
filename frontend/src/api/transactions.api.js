import { apiClient } from './client';

export const transactionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/admin/reports/transactions${query ? `?${query}` : ''}`);
  },

  sync: (paymentId) =>
    apiClient(`/admin/reconciliation/sync/${paymentId}`, {
      method: 'POST',
    }),
};

