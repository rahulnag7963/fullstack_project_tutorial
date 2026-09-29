import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONCEPT_MENU, explainRecord } from './concepts.js';

const record = (overrides) => ({ method: 'GET', path: '/api/todos', search: '', status: 200, error: null, ...overrides });

describe('explainRecord', () => {
  it.each([
    [record({}), 'get'],
    [record({ method: 'POST', status: 201 }), 'post'],
    [record({ method: 'PATCH', path: '/api/todos/1' }), 'patch'],
    [record({ method: 'DELETE', path: '/api/todos/1', status: 204 }), 'delete'],
    [record({ status: 401 }), 'unauthorized'],
    [record({ method: 'PATCH', path: '/api/todos/1', status: 404 }), 'authorization'],
    [record({ method: 'DELETE', path: '/api/todos/1', status: 404 }), 'authorization'],
    [record({ method: 'POST', status: 400 }), 'validation'],
    [record({ status: 500 }), 'serverError'],
    [record({ status: null, error: 'Failed to fetch' }), 'serverError'],
    [record({ method: 'POST', path: '/auth/v1/token', search: '?grant_type=password' }), 'login'],
    [record({ method: 'POST', path: '/auth/v1/token', search: '?grant_type=refresh_token' }), 'refresh'],
    [record({ method: 'POST', path: '/auth/v1/token', search: '?grant_type=password', status: 400 }), 'loginFailed'],
    [record({ method: 'POST', path: '/auth/v1/signup' }), 'signup'],
    [record({ method: 'POST', path: '/auth/v1/signup', status: 422 }), 'loginFailed'],
    [record({ method: 'POST', path: '/auth/v1/logout', status: 204 }), 'logout'],
    [record({ path: '/auth/v1/user' }), 'whoami'],
  ])('explains %o as %s', (input, key) => {
    const result = explainRecord(input);
    expect(result.key).toBe(key);
    expect(result.concept).toBe(CONCEPTS[key]);
  });

  it('points at the code that handled the request', () => {
    expect(explainRecord(record({ method: 'POST', status: 201 })).code).toBe("server/src/routes/todos.js → router.post('/')");
  });
});

describe('CONCEPTS', () => {
  it('gives every concept a title, summary and analogy', () => {
    for (const [key, concept] of Object.entries(CONCEPTS)) {
      expect(concept.title, key).toBeTruthy();
      expect(concept.summary, key).toBeTruthy();
      expect(concept.analogy, key).toBeTruthy();
    }
  });

  it('only lists menu entries that exist', () => {
    for (const [key] of CONCEPT_MENU) expect(CONCEPTS[key], key).toBeDefined();
  });

  it('never uses the em dash character', () => {
    expect(JSON.stringify(CONCEPTS)).not.toContain('\u2014');
  });
});
