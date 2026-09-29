import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loggedFetch, requestLog } from './requestLog.js';

beforeEach(() => {
  requestLog.clear();
  vi.restoreAllMocks();
});

describe('loggedFetch', () => {
  it('records a request and still returns a readable response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc', title: 'Read' }), { status: 201 }),
    );

    const response = await loggedFetch('/api/todos', {
      method: 'POST',
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload-part.signature-part', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Read' }),
    });

    expect(await response.json()).toEqual({ id: 'abc', title: 'Read' });
    const [record] = requestLog.getSnapshot();
    expect(record).toMatchObject({
      method: 'POST',
      url: '/api/todos',
      path: '/api/todos',
      status: 201,
      requestBody: { title: 'Read' },
      responseBody: { id: 'abc', title: 'Read' },
      error: null,
    });
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('hides passwords and shortens tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'a'.repeat(100), user: { email: 'a@b.c' } }), { status: 200 }),
    );

    await loggedFetch('https://example.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.c', password: 'secret123' }),
    });

    const [record] = requestLog.getSnapshot();
    expect(record.url).toBe('https://example.supabase.co/auth/v1/token?grant_type=password');
    expect(record.search).toBe('?grant_type=password');
    expect(record.requestBody.password).toBe('•••••• (hidden)');
    expect(record.responseBody.access_token).toBe(`${'a'.repeat(20)}…`);
    expect(record.responseBody.user.email).toBe('a@b.c');
  });

  it('records a network failure and rethrows it', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(loggedFetch('/api/todos')).rejects.toThrow('Failed to fetch');
    const [record] = requestLog.getSnapshot();
    expect(record).toMatchObject({ method: 'GET', status: null, error: 'Failed to fetch' });
  });

  it('keeps the newest record first', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));
    await loggedFetch('/api/one');
    await loggedFetch('/api/two');
    expect(requestLog.getSnapshot().map((r) => r.path)).toEqual(['/api/two', '/api/one']);
  });
});
