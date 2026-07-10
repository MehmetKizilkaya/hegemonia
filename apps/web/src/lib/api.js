const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function getAuthToken() {
  return localStorage.getItem('hegemonia_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('hegemonia_token', token);
  } else {
    localStorage.removeItem('hegemonia_token');
  }
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? 'İstek başarısız');
    err.status = res.status;
    err.code = data.code;
    err.details = data.details;
    throw err;
  }

  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  regions: () => request('/api/regions'),
  region: (slug) => request(`/api/regions/${slug}`),
  health: () => request('/health'),
};
