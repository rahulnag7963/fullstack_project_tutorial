import { HttpError } from './errors.js';
import { MAX_TEXT_LENGTH } from '../../shared/constants.js';

// SECURITY: the server never trusts what the browser sends.
// Anyone can skip our web page and send requests directly, so every input is checked here.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(message) {
  return new HttpError(400, 'invalid_input', message);
}

function text(value, field, { required }) {
  if (value === undefined) {
    if (required) throw invalid(`${field} is required.`);
    return undefined;
  }
  if (typeof value !== 'string') throw invalid(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw invalid(`${field} cannot be empty.`);
  if (trimmed.length > MAX_TEXT_LENGTH) throw invalid(`${field} must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  return trimmed;
}

export function validateId(id) {
  if (!UUID.test(id)) throw new HttpError(400, 'invalid_id', 'That is not a valid todo id.');
  return id;
}

// For POST. Only title and note are copied, so a sneaky request cannot choose
// its own id or owner (user_id). The owner always comes from the verified token.
export function validateNewTodo(body = {}) {
  return {
    title: text(body.title, 'Title', { required: true }),
    note: text(body.note, 'Note', { required: false }) ?? '',
  };
}

// For PATCH. Any of title, note or done, but at least one.
export function validateTodoChanges(body = {}) {
  const changes = {};
  if (body.title !== undefined) changes.title = text(body.title, 'Title', { required: true });
  if (body.note !== undefined) changes.note = text(body.note, 'Note', { required: false });
  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') throw invalid('Done must be true or false.');
    changes.done = body.done;
  }
  if (Object.keys(changes).length === 0) throw invalid('Send at least one of title, note or done.');
  return changes;
}
