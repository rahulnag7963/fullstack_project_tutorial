import { useSyncExternalStore } from 'react';

// Every network request the app makes is recorded here, so the
// "What just happened?" panel shows real traffic, not a script.

const MAX_RECORDS = 50;
const HIDDEN_FIELDS = new Set(['password']);
const TOKEN_FIELDS = new Set(['access_token', 'refresh_token', 'provider_token']);

let records = [];
let nextId = 1;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export const requestLog = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => records,
  clear() {
    records = [];
    notify();
  },
};

// React hook: re-renders the component whenever a new request is recorded.
export function useRequestLog() {
  return useSyncExternalStore(requestLog.subscribe, requestLog.getSnapshot);
}

// Tokens are long and should not sit on a projector in full, so show only the start.
function shorten(text) {
  return text.length > 24 ? `${text.slice(0, 20)}…` : text;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => {
        if (HIDDEN_FIELDS.has(key)) return [key, '•••••• (hidden)'];
        if (TOKEN_FIELDS.has(key) && typeof inner === 'string') return [key, shorten(inner)];
        return [key, redact(inner)];
      }),
    );
  }
  return value;
}

function redactHeaders(headers) {
  const result = {};
  new Headers(headers ?? {}).forEach((value, key) => {
    if (key === 'authorization') {
      const [scheme, token = ''] = value.split(' ');
      result[key] = `${scheme} ${shorten(token)}`;
    } else if (key === 'apikey') {
      result[key] = shorten(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function parseBody(body) {
  if (body == null || body === '') return null;
  if (typeof body !== 'string') return '[binary data]';
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

// A drop-in replacement for fetch() that records the request and its response.
export async function loggedFetch(input, init = {}) {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
  const sameOrigin = url.origin === window.location.origin;
  const record = {
    id: nextId++,
    method: (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
    url: sameOrigin ? url.pathname + url.search : url.href,
    path: url.pathname,
    search: url.search,
    requestHeaders: redactHeaders(init.headers),
    requestBody: redact(parseBody(init.body)),
    status: null,
    responseBody: null,
    error: null,
    durationMs: null,
  };

  const started = performance.now();
  try {
    const response = await fetch(input, init);
    record.status = response.status;
    // clone() lets us read the body here while the caller can still read it too.
    record.responseBody = redact(parseBody(await response.clone().text()));
    return response;
  } catch (error) {
    record.error = error.message;
    throw error;
  } finally {
    record.durationMs = Math.round(performance.now() - started);
    records = [record, ...records].slice(0, MAX_RECORDS);
    notify();
  }
}
