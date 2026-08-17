const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
    if (match) return match[2];
  }
  return null;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
}

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  post: async (endpoint: string, data: unknown) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      cache: 'no-store',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  patch: async (endpoint: string, data: unknown) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      cache: 'no-store',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PATCH ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = errData.error;
      } catch (e) {}
      throw new Error(errorMsg || `DELETE ${endpoint} failed`);
    }
  },

  login: async (username: string, password: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error('Login failed. Check your credentials.');
    }
    const data = await response.json();
    if (typeof window !== 'undefined') {
      document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('auth_token', data.token);
    }
    return data.token;
  },
};
