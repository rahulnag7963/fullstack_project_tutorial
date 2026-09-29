import { describe, expect, it } from 'vitest';
import { validateId, validateNewTodo, validateTodoChanges } from '../src/validate.js';
import { HttpError } from '../src/errors.js';

function expectHttpError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(400);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error('Expected an HttpError to be thrown');
}

describe('validateNewTodo', () => {
  it('trims the title and defaults the note to empty', () => {
    expect(validateNewTodo({ title: '  Buy milk  ' })).toEqual({ title: 'Buy milk', note: '' });
  });

  it('keeps only title and note, so a client cannot set user_id or id', () => {
    expect(validateNewTodo({ title: 'A', note: 'B', user_id: 'x', id: 'y', done: true })).toEqual({ title: 'A', note: 'B' });
  });

  it.each([
    ['a missing body', undefined],
    ['a missing title', {}],
    ['a blank title', { title: '   ' }],
    ['a non-text title', { title: 5 }],
    ['a title that is too long', { title: 'x'.repeat(201) }],
    ['a note that is too long', { title: 'ok', note: 'x'.repeat(201) }],
  ])('rejects %s', (_label, body) => {
    expectHttpError(() => validateNewTodo(body), 'invalid_input');
  });
});

describe('validateTodoChanges', () => {
  it('returns only the fields that were sent', () => {
    expect(validateTodoChanges({ done: true })).toEqual({ done: true });
    expect(validateTodoChanges({ title: ' New ', note: 'n' })).toEqual({ title: 'New', note: 'n' });
  });

  it('rejects an empty change', () => {
    expectHttpError(() => validateTodoChanges({}), 'invalid_input');
  });

  it('rejects a done value that is not true or false', () => {
    expectHttpError(() => validateTodoChanges({ done: 'yes' }), 'invalid_input');
  });
});

describe('validateId', () => {
  it('accepts a uuid', () => {
    expect(validateId('00000000-0000-4000-8000-00000000a11c')).toBe('00000000-0000-4000-8000-00000000a11c');
  });

  it('rejects anything else', () => {
    expectHttpError(() => validateId('42'), 'invalid_id');
  });
});
