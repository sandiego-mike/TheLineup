const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:3001/api';

export async function api(path, { userId = 1, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(userId)
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const wrapped = new Error(error.message);
    wrapped.status = response.status;
    wrapped.details = error;
    throw wrapped;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/')) return response.text();
  return response.json();
}
