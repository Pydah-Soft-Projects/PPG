import { apiClient } from './client';

export const collegesApi = {
  getDbStatus: () => apiClient('/admin/colleges/db-status'),
  getColleges: () => apiClient('/admin/colleges'),
  getCourses: (collegeId) => apiClient(`/admin/colleges/${collegeId}/courses`),
  getRoutingRules: () => apiClient('/admin/colleges/rules/all'),
  upsertRoutingRule: (data) => apiClient('/admin/colleges/rules', { method: 'POST', body: data }),
  batchUpsertRoutingRules: (data) => apiClient('/admin/colleges/rules/batch', { method: 'POST', body: data }),
  updateRoutingRule: (id, data) => apiClient(`/admin/colleges/rules/${id}`, { method: 'PATCH', body: data }),
  deleteRoutingRule: (id) => apiClient(`/admin/colleges/rules/${id}`, { method: 'DELETE' }),
};
