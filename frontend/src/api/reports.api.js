import { apiClient } from './client';

export const reportsApi = {
  getOverview: () => apiClient('/admin/reports/overview'),
};

