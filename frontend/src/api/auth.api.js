import { apiClient } from './client';

export const authApi = {
  login: (username, password) =>
    apiClient('/admin/auth/login', {
      body: { username, password },
    }),

  register: (data) =>
    apiClient('/admin/auth/register', {
      body: data,
    }),

  getMe: () => apiClient('/admin/auth/me'),

  listUsers: () => apiClient('/admin/auth/users'),
};

