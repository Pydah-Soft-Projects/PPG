import { apiClient } from './client';

export const reconciliationApi = {
  getExceptions: () => apiClient('/admin/reconciliation/exceptions'),

  sync: (paymentId) =>
    apiClient(`/admin/reconciliation/sync/${paymentId}`, {
      method: 'POST',
    }),
};

