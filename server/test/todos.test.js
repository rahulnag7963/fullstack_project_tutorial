import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { signInOrSignUp } from '../scripts/signInOrSignUp.js';

// Dedicated test users, so the classroom demo data is never touched.
const PASSWORD = 'test-password-123';
const app = createApp();
let alice;
let bob;

const as = (user) => ({ Authorization: `Bearer ${user.session.access_token}` });

async function clearTodos(user) {
  const { error } = await user.client.from('todos').delete().eq('user_id', user.session.user.id);
  if (error) throw error;
}

async function createTodo(user, body) {
  const res = await request(app).post('/api/todos').set(as(user)).send(body);
  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  alice = await signInOrSignUp('test-alice@demo.test', PASSWORD);
  bob = await signInOrSignUp('test-bob@demo.test', PASSWORD);
});

beforeEach(async () => {
  await clearTodos(alice);
  await clearTodos(bob);
});

describe('authentication', () => {
  it('rejects a request with no token (401)', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects a fake token (401)', async () => {
    const res = await request(app).get('/api/todos').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('CRUD as the owner', () => {
  it('POST creates a todo (201)', async () => {
    const res = await request(app).post('/api/todos').set(as(alice)).send({ title: '  Read  ', note: 'Daily' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Read', note: 'Daily', done: false });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).not.toHaveProperty('user_id');
  });

  it('GET lists only my todos, oldest first (200)', async () => {
    await createTodo(alice, { title: 'First' });
    await createTodo(alice, { title: 'Second' });
    await createTodo(bob, { title: 'Bob only' });

    const res = await request(app).get('/api/todos').set(as(alice));
    expect(res.status).toBe(200);
    expect(res.body.map((todo) => todo.title)).toEqual(['First', 'Second']);
  });

  it('PATCH changes only the fields sent (200)', async () => {
    const todo = await createTodo(alice, { title: 'Paint', note: 'Blue' });
    const res = await request(app).patch(`/api/todos/${todo.id}`).set(as(alice)).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: todo.id, title: 'Paint', note: 'Blue', done: true });
  });

  it('DELETE removes a todo (204)', async () => {
    const todo = await createTodo(alice, { title: 'Gone soon' });
    const res = await request(app).delete(`/api/todos/${todo.id}`).set(as(alice));
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const list = await request(app).get('/api/todos').set(as(alice));
    expect(list.body).toEqual([]);
  });
});

describe('authorization', () => {
  it("PATCH on someone else's todo is 404 and changes nothing", async () => {
    const bobs = await createTodo(bob, { title: 'Secret' });
    const res = await request(app).patch(`/api/todos/${bobs.id}`).set(as(alice)).send({ title: 'Hacked' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');

    const list = await request(app).get('/api/todos').set(as(bob));
    expect(list.body[0].title).toBe('Secret');
  });

  it("DELETE on someone else's todo is 404 and deletes nothing", async () => {
    const bobs = await createTodo(bob, { title: 'Keep me' });
    const res = await request(app).delete(`/api/todos/${bobs.id}`).set(as(alice));
    expect(res.status).toBe(404);

    const list = await request(app).get('/api/todos').set(as(bob));
    expect(list.body).toHaveLength(1);
  });

  it('ignores a user_id sent in the body', async () => {
    await request(app).post('/api/todos').set(as(alice)).send({ title: 'Mine', user_id: bob.session.user.id });
    const bobsList = await request(app).get('/api/todos').set(as(bob));
    const alicesList = await request(app).get('/api/todos').set(as(alice));
    expect(bobsList.body).toEqual([]);
    expect(alicesList.body.map((todo) => todo.title)).toEqual(['Mine']);
  });
});

describe('validation and errors', () => {
  it('POST with a blank title is 400', async () => {
    const res = await request(app).post('/api/todos').set(as(alice)).send({ title: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });

  it('PATCH with a bad id is 400', async () => {
    const res = await request(app).patch('/api/todos/42').set(as(alice)).send({ done: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_id');
  });

  it('malformed JSON is 400', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set(as(alice))
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it('an unknown API route is 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
