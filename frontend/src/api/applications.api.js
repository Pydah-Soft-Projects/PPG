import { apiClient } from './client';

export const applicationsApi = {
  list: () => apiClient('/admin/applications'),

  getById: (id) => apiClient(`/admin/applications/${id}`),

  create: (data) =>
    apiClient('/admin/applications', {
      body: data,
    }),

  update: (id, data) =>
    apiClient(`/admin/applications/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  rotateCredentials: (id) =>
    apiClient(`/admin/applications/${id}/rotate-credentials`, {
      method: 'POST',
    }),
};

