import { apiClient } from './client';

export const refundsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/admin/refunds${query ? `?${query}` : ''}`);
  },

  create: (data) =>
    apiClient('/admin/refunds', {
      body: data,
    }),
};

