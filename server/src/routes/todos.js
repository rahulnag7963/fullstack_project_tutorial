import { Router } from 'express';
import { HttpError } from '../errors.js';
import { validateId, validateNewTodo, validateTodoChanges } from '../validate.js';

const router = Router();

// The columns we send back. user_id stays on the server: the browser does not need it.
const COLUMNS = 'id, title, note, done, created_at';

// AUTHORIZATION: "What are you allowed to do?"
// We answer 404 Not Found rather than 403 Forbidden, so we don't even reveal that the todo exists.
function notYours() {
  return new HttpError(404, 'not_found', 'No todo with that id belongs to you.');
}

// GET /api/todos : READ. Ask for data; nothing on the server changes.
router.get('/', async (req, res) => {
  const { data, error } = await req.db
    .from('todos')
    .select(COLUMNS)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  res.json(data);
});

// POST /api/todos : CREATE. Send something new to be saved. Answers 201 Created.
router.post('/', async (req, res) => {
  const todo = validateNewTodo(req.body);
  // The owner comes from the verified token, never from the request body.
  const { data, error } = await req.db
    .from('todos')
    .insert({ ...todo, user_id: req.user.id })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  res.status(201).json(data);
});

// PATCH /api/todos/:id : UPDATE. Change part of a todo that already exists.
router.patch('/:id', async (req, res) => {
  const id = validateId(req.params.id);
  const changes = validateTodoChanges(req.body);
  const { data, error } = await req.db
    .from('todos')
    .update(changes)
    .eq('id', id)
    .eq('user_id', req.user.id) // only if it belongs to this user
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notYours();
  res.json(data);
});

// DELETE /api/todos/:id : REMOVE. Answers 204 No Content: "done, nothing more to say".
router.delete('/:id', async (req, res) => {
  const id = validateId(req.params.id);
  const { data, error } = await req.db
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id) // only if it belongs to this user
    .select('id');
  if (error) throw error;
  if (data.length === 0) throw notYours();
  res.status(204).end();
});

export default router;
