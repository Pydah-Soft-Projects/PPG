const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiClient(endpoint, { body, ...customConfig } = {}) {
  const token = localStorage.getItem('ppg_admin_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customConfig.headers,
  };

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status === 401 && !endpoint.includes('/admin/auth/login')) {
      // Token expired or invalid
      localStorage.removeItem('ppg_admin_token');
      localStorage.removeItem('ppg_admin_user');
      window.dispatchEvent(new Event('ppg:auth_expired'));
    }
    throw err;
  }
}

