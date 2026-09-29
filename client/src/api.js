import { loggedFetch } from './requestLog.js';
import { supabase } from './supabaseClient.js';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = {};
  // The token is our "wristband": it proves who we are on every request.
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await loggedFetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server. Is it running?');
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'unknown_error',
      payload?.error?.message ?? `The request failed with status ${response.status}.`,
    );
  }
  return payload;
}

// One function per HTTP method the app uses.
export const todosApi = {
  list: () => request('GET', '/api/todos'),
  create: (todo) => request('POST', '/api/todos', todo),
  update: (id, changes) => request('PATCH', `/api/todos/${id}`, changes),
  remove: (id) => request('DELETE', `/api/todos/${id}`),
};
