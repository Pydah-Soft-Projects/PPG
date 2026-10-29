import { apiClient } from './client';

export const providersApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/admin/providers${query ? `?${query}` : ''}`);
  },

  getById: (id) => apiClient(`/admin/providers/${id}`),

  create: (data) =>
    apiClient('/admin/providers', {
      body: data,
    }),

  update: (id, data) =>
    apiClient(`/admin/providers/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  rotateCredentials: (id, data) =>
    apiClient(`/admin/providers/${id}/rotate-credentials`, {
      body: data,
    }),

  assignApplications: (id, allowedApplicationIds) =>
    apiClient(`/admin/providers/${id}/assign-applications`, {
      body: { allowedApplicationIds },
    }),

  testConnection: (id) =>
    apiClient(`/admin/providers/${id}/test-connection`, {
      method: 'POST',
    }),
};

