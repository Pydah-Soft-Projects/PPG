import { apiClient } from './client';

export const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
};

