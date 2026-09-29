# System Design Tutor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a todo app with a login page that teaches beginners GET, POST, PATCH, DELETE, authentication, authorization, security and state through a live "What just happened?" panel.

**Architecture:** A React (Vite) client talks to a small Express API through a Vite dev proxy.
Express verifies the Supabase JWT on every request and queries Postgres as that user, so Row Level Security applies as a second lock.
Every network call in the browser goes through one logging `fetch` wrapper, which feeds the teaching panel with real traffic.

**Tech Stack:** Node 20, npm workspaces, Express 5, @supabase/supabase-js v2, React 19, Vite, Vitest, Supertest, React Testing Library, Playwright, ESLint 9 (flat config).

**Design doc:** `docs/plans/2026-09-29-system-design-tutor-design.md`

**Deviation from design:** the "Peek at token" and "State inspector" demos are tabs in the panel (Live, State, Token, Concepts) instead of toolbar buttons.
Tabs keep the panel in one place on the projector.
The "Try to edit someone else's todo" button stays under the todo list.

**Conventions for every task:**
- Plain JavaScript, ES modules everywhere.
- Commit messages have no co-author trailer (user's global instruction).
- Never use the em dash character in code, comments, copy or docs.
- Markdown files: one sentence per line.
- `.env` is never committed and never overwritten; only append to it.

---

### Task 0: Supabase project settings (manual, needs the user)

**Why:** Supabase currently requires email confirmation (`mailer_autoconfirm: false`).
Demo, seed and test accounts use fake `@demo.test` addresses that can never confirm, so sign-up must log in immediately.

**Step 1: Ask the user to turn off email confirmation**

Tell the user:
"In the Supabase dashboard for project `iqafcgrrbeqjzypiaipq`, open Authentication → Sign In / Providers → Email, turn off **Confirm email**, and save."
Wait for them to confirm.

**Step 2: Verify the setting**

Run:
```bash
curl -s https://iqafcgrrbeqjzypiaipq.supabase.co/auth/v1/settings -H "apikey: <publishable key>" | grep -o '"mailer_autoconfirm":[a-z]*'
```
Get the publishable key (`sb_publishable_...`) with the Supabase MCP tool `get_publishable_keys`.
Expected: `"mailer_autoconfirm":true`

**Step 3: Verify the demo email domain is accepted**

Run:
```bash
curl -s -X POST https://iqafcgrrbeqjzypiaipq.supabase.co/auth/v1/signup \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.test","password":"demo-password-123"}' | head -c 300
```
Expected: JSON containing `"access_token"`.
If the response contains `email_address_invalid`, stop and ask the user which email domain to use for demo and test accounts, then replace `demo.test` everywhere in this plan.
The account created here is reused by the seed script, which logs in when an account already exists.

---

### Task 1: Monorepo scaffold and tooling

**Files:**
- Create: `package.json`, `eslint.config.js`, `.env.example`, `shared/constants.js`
- Create: `server/package.json`, `client/package.json`
- Modify: `.env` (append only)

**Step 1: Root `package.json`**

```json
{
  "name": "system-design-tutor",
  "private": true,
  "type": "module",
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w server\" \"npm run dev -w client\"",
    "seed": "npm run seed -w server",
    "test": "npm test --workspaces",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  }
}
```

**Step 2: `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "seed": "node scripts/seed.js",
    "test": "vitest run"
  }
}
```

**Step 3: `client/package.json`**

```json
{
  "name": "client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  }
}
```

**Step 4: Install dependencies**

Run:
```bash
npm install -D concurrently @playwright/test eslint @eslint/js globals eslint-plugin-react eslint-plugin-react-hooks
npm install -w server express @supabase/supabase-js dotenv
npm install -w server -D vitest supertest
npm install -w client react react-dom @supabase/supabase-js
npm install -w client -D vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom
npx playwright install chromium
```
Expected: installs finish without errors, and a single `package-lock.json` exists at the root.

**Step 5: `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Lets ESLint see that components used in JSX are "used".
      'react/jsx-uses-vars': 'error',
    },
  },
];
```

**Step 6: `.env.example`**

```bash
# Copy this file to .env and fill in the values.
# Variables starting with PUBLIC_ are safe to show in the browser.
# Vite only bundles PUBLIC_ variables into the client, so anything else stays secret.

# Supabase project URL (Dashboard → Project Settings → API).
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# Publishable key (starts with sb_publishable_). Identifies the app, not a user.
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Port for the Express API.
PORT=3001
```

**Step 7: Append real values to `.env`**

Read `.env` first; it already holds `supabase_pw`, which must stay.
Append (do not overwrite):
```bash
PUBLIC_SUPABASE_URL=https://iqafcgrrbeqjzypiaipq.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<value from get_publishable_keys, the sb_publishable_ one>
PORT=3001
```

**Step 8: `shared/constants.js`**

```js
// Values shared by the browser app and the server, so both sides agree.

// Longest title or note the app accepts.
// The browser checks it to be helpful, the server checks it again to be safe,
// and the database enforces it a third time.
export const MAX_TEXT_LENGTH = 200;

// Demo accounts created by `npm run seed`.
export const DEMO_PASSWORD = 'demo-password-123';

export const DEMO_USERS = {
  alice: {
    email: 'alice@demo.test',
    // Alice's first todo gets this fixed id, so the "someone else's todo" demo always has a target.
    pinnedTodoId: '00000000-0000-4000-8000-00000000a11c',
    todos: [
      { title: 'Reading books', note: 'Read every day', done: true },
      { title: 'Painting', note: 'Half an hour a day', done: true },
      { title: 'Save money', note: 'Five dollars a day' },
      { title: 'Climb mountains', note: 'Three hours today' },
    ],
  },
  bob: {
    email: 'bob@demo.test',
    pinnedTodoId: '00000000-0000-4000-8000-000000000b0b',
    todos: [
      { title: "Bob's secret plan", note: 'Only Bob should see this' },
      { title: 'Buy milk', note: 'Two litres' },
    ],
  },
};

// The id of a todo that belongs to a *different* demo user than `email`.
export function foreignTodoId(email) {
  return email === DEMO_USERS.bob.email ? DEMO_USERS.alice.pinnedTodoId : DEMO_USERS.bob.pinnedTodoId;
}
```

**Step 9: Verify lint runs**

Run: `npm run lint`
Expected: exits 0.

**Step 10: Commit**

```bash
git add package.json package-lock.json eslint.config.js .env.example shared server/package.json client/package.json
git commit -m "chore: scaffold npm workspaces, lint and shared constants"
```

---

### Task 2: Database table and security rules

**Files:**
- Create: `supabase/migrations/20260929000000_create_todos.sql`

**Step 1: Write the migration file**

```sql
-- Each row is one todo that belongs to exactly one user.
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  note text not null default '' check (char_length(note) <= 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Makes "all todos for this user, oldest first" fast.
create index todos_user_id_created_at_idx on public.todos (user_id, created_at);

-- Only logged-in users may touch this table at all. Visitors who are not logged in get nothing.
revoke all on public.todos from anon;
grant select, insert, update, delete on public.todos to authenticated;

-- ROW LEVEL SECURITY: the database itself refuses to show or change another user's rows,
-- even if the server code had a bug. This is the second lock behind the Express server.
alter table public.todos enable row level security;

create policy "Users can read their own todos"
  on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create todos for themselves"
  on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own todos"
  on public.todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);
```

**Step 2: Apply it**

Use the Supabase MCP tool `apply_migration` with name `create_todos` and the SQL above.
Expected: success.

**Step 3: Verify**

Use `list_tables` with `schemas: ["public"], verbose: true`.
Expected: `todos` with the six columns and RLS enabled.
Use `get_advisors` with type `security`.
Expected: no warnings about `public.todos`.
Other project-level advisories, such as leaked password protection, should be reported to the user, not silently ignored.

**Step 4: Commit**

```bash
git add supabase
git commit -m "feat(db): add todos table with owner-only row level security"
```

---

### Task 3: Server config, errors and validation (TDD)

**Files:**
- Create: `server/vitest.config.js`, `server/src/config.js`, `server/src/errors.js`, `server/src/validate.js`
- Test: `server/test/validate.test.js`

**Step 1: `server/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests talk to the real Supabase project over the network.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Test files share the same test users, so run them one at a time.
    fileParallelism: false,
  },
});
```

**Step 2: Write the failing test `server/test/validate.test.js`**

```js
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
```

**Step 3: Run it to verify it fails**

Run: `npm test -w server`
Expected: FAIL, cannot resolve `../src/validate.js`.

**Step 4: `server/src/config.js`**

```js
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';

// All settings live in one .env file at the repository root.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env (see .env.example)`);
  return value;
}

export const SUPABASE_URL = required('PUBLIC_SUPABASE_URL');
export const SUPABASE_KEY = required('PUBLIC_SUPABASE_PUBLISHABLE_KEY');
export const PORT = Number(process.env.PORT ?? 3001);
```

**Step 5: `server/src/errors.js`**

```js
// An error the server sends back on purpose, with an HTTP status code
// and a short machine-readable code the browser can react to.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// One place turns every error into the same JSON shape: { error: { code, message } }.
// Unexpected errors are logged on the server but never sent to the browser,
// because error details can show an attacker how the system works inside.
// eslint-disable-next-line no-unused-vars -- Express spots error handlers by their four arguments.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Errors from express.json(), such as malformed JSON or a body that is too large.
  if (err.expose && err.status < 500) {
    const code = err.type === 'entity.parse.failed' ? 'invalid_json' : 'bad_request';
    const message = code === 'invalid_json' ? 'The request body is not valid JSON.' : err.message;
    return res.status(err.status).json({ error: { code, message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on the server.' } });
}
```

**Step 6: `server/src/validate.js`**

```js
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
```

Note: `validateNewTodo(undefined)` uses the default `{}`; `validateNewTodo(null)` would not, but `express.json()` never produces `null` for `req.body`.

**Step 7: Run tests to verify they pass**

Run: `npm test -w server`
Expected: all `validate.test.js` tests PASS.

**Step 8: Lint and commit**

```bash
npm run lint
git add server
git commit -m "feat(server): add config, error handler and input validation"
```

---

### Task 4: Auth middleware and todo routes (TDD, integration)

**Files:**
- Create: `server/scripts/signInOrSignUp.js`, `server/src/supabase.js`, `server/src/middleware/requireAuth.js`, `server/src/routes/todos.js`, `server/src/app.js`, `server/src/index.js`
- Test: `server/test/todos.test.js`

**Step 1: `server/scripts/signInOrSignUp.js`** (test and seed helper)

```js
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../src/config.js';

// Logs in as a user, creating the account first if it does not exist yet.
// Returns a Supabase client that acts as that user, plus the session (which holds the token).
export async function signInOrSignUp(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === 'invalid_credentials') {
    ({ data, error } = await client.auth.signUp({ email, password }));
  }
  if (error) throw new Error(`Could not log in as ${email}: ${error.message}`);
  if (!data.session) {
    throw new Error(`No session for ${email}. Turn off "Confirm email" in Supabase Auth settings (see README).`);
  }
  return { client, session: data.session };
}
```

**Step 2: Write the failing test `server/test/todos.test.js`**

```js
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
```

**Step 3: Run to verify it fails**

Run: `npm test -w server`
Expected: FAIL, cannot resolve `../src/app.js`.

**Step 4: `server/src/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Used only to check tokens with Supabase Auth.
export const authClient = createClient(SUPABASE_URL, SUPABASE_KEY, options);

// A Supabase client that acts *as the logged-in user*.
// Because it forwards the user's token, the database's Row Level Security rules
// apply to every query: a second lock behind the server's own checks.
export function supabaseAsUser(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
```

**Step 5: `server/src/middleware/requireAuth.js`**

```js
import { HttpError } from '../errors.js';
import { authClient, supabaseAsUser } from '../supabase.js';

// AUTHENTICATION: "Who are you?"
// Every request must carry a token (the "wristband") in the header:
//   Authorization: Bearer <token>
// We ask Supabase Auth whether the token is genuine and not expired.
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'unauthorized', 'Log in first: this request has no token.');
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'unauthorized', 'Your token is invalid or has expired. Log in again.');
  }

  req.user = data.user;
  req.db = supabaseAsUser(token);
  next();
}
```

Express 5 forwards errors thrown by async middleware to the error handler, so no `try`/`catch` is needed.

**Step 6: `server/src/routes/todos.js`**

```js
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
```

**Step 7: `server/src/app.js`**

```js
import express from 'express';
import { errorHandler, HttpError } from './errors.js';
import { requireAuth } from './middleware/requireAuth.js';
import todosRouter from './routes/todos.js';

export function createApp() {
  const app = express();

  // Read JSON request bodies. The size limit stops someone sending huge requests.
  app.use(express.json({ limit: '10kb' }));

  // Every /api/todos route needs a logged-in user.
  app.use('/api/todos', requireAuth, todosRouter);

  app.use('/api', () => {
    throw new HttpError(404, 'not_found', 'There is no API route here.');
  });

  app.use(errorHandler);
  return app;
}
```

**Step 8: `server/src/index.js`**

```js
import { createApp } from './app.js';
import { PORT } from './config.js';

createApp().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
```

**Step 9: Run tests to verify they pass**

Run: `npm test -w server`
Expected: all tests in `validate.test.js` and `todos.test.js` PASS.
If sign-in fails with a "No session" message, Task 0 was not completed.

**Step 10: Smoke test the running server**

Run: `npm start -w server` in the background, then `curl -s -i http://localhost:3001/api/todos`.
Expected: `HTTP/1.1 401` with body `{"error":{"code":"unauthorized","message":"Log in first: this request has no token."}}`.
Stop the server.

**Step 11: Lint and commit**

```bash
npm run lint
git add server
git commit -m "feat(server): add auth middleware and CRUD routes for todos"
```

---

### Task 5: Seed script for the demo accounts

**Files:**
- Create: `server/scripts/seed.js`

**Step 1: Write `server/scripts/seed.js`**

```js
import { DEMO_PASSWORD, DEMO_USERS } from '../../shared/constants.js';
import { signInOrSignUp } from './signInOrSignUp.js';

// Resets the demo accounts to the same todos every time, so each class starts identical.
for (const user of Object.values(DEMO_USERS)) {
  const { client, session } = await signInOrSignUp(user.email, DEMO_PASSWORD);
  const userId = session.user.id;

  const { error: clearError } = await client.from('todos').delete().eq('user_id', userId);
  if (clearError) throw clearError;

  // Spread created_at one second apart so the list order is always the same.
  const start = Date.now();
  const rows = user.todos.map((todo, index) => ({
    ...todo,
    user_id: userId,
    created_at: new Date(start + index * 1000).toISOString(),
    ...(index === 0 && { id: user.pinnedTodoId }),
  }));

  const { error: insertError } = await client.from('todos').insert(rows);
  if (insertError) throw insertError;

  await client.auth.signOut();
  console.log(`Seeded ${user.email} with ${rows.length} todos.`);
}
```

**Step 2: Run it twice**

Run: `npm run seed` then `npm run seed` again.
Expected both times:
```
Seeded alice@demo.test with 4 todos.
Seeded bob@demo.test with 2 todos.
```

**Step 3: Verify with SQL**

Use Supabase MCP `execute_sql`:
```sql
select u.email, t.id, t.title from public.todos t join auth.users u on u.id = t.user_id
where u.email in ('alice@demo.test', 'bob@demo.test') order by u.email, t.created_at;
```
Expected: 6 rows, and the first row of each user has the pinned id from `shared/constants.js`.

**Step 4: Lint and commit**

```bash
npm run lint
git add server/scripts/seed.js
git commit -m "feat(server): add re-runnable seed for demo accounts"
```

---

### Task 6: Client scaffold

**Files:**
- Create: `client/vite.config.js`, `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx` (placeholder), `client/src/test/setup.js`

**Step 1: `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read the one shared .env file at the repository root.
  envDir: '..',
  // SECURITY: only variables starting with PUBLIC_ are bundled into browser code.
  // Everything else in .env (like the database password) stays off the browser.
  envPrefix: 'PUBLIC_',
  server: {
    port: 5173,
    strictPort: true,
    // Forward /api requests to the Express server, so the browser only talks to one address.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
```

**Step 2: `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>System Design Tutor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 3: `client/src/main.jsx`**

```jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No <StrictMode> on purpose: in development it runs effects twice, which would show
// every page-load GET request twice in the teaching panel and confuse students.
createRoot(document.getElementById('root')).render(<App />);
```

**Step 4: Placeholder `client/src/App.jsx` and empty `client/src/styles.css`**

```jsx
export default function App() {
  return <p>System Design Tutor</p>;
}
```

**Step 5: `client/src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);
```

**Step 6: Verify dev server and build**

Run: `npm run build -w client`
Expected: build succeeds.
Run `npm run dev` in the background, open `http://localhost:5173`, and confirm the text "System Design Tutor" renders. Stop it.

**Step 7: Commit**

```bash
git add client
git commit -m "chore(client): scaffold Vite React app with API proxy"
```

---

### Task 7: Request log, the panel's data source (TDD)

**Files:**
- Create: `client/src/requestLog.js`
- Test: `client/src/requestLog.test.js`

**Step 1: Write the failing test**

```js
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
```

**Step 2: Run to verify it fails**

Run: `npm test -w client`
Expected: FAIL, cannot resolve `./requestLog.js`.

**Step 3: Implement `client/src/requestLog.js`**

```js
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
```

**Step 4: Run tests to verify they pass**

Run: `npm test -w client`
Expected: PASS.

**Step 5: Lint and commit**

```bash
npm run lint
git add client/src/requestLog.js client/src/requestLog.test.js
git commit -m "feat(client): record every network request for the teaching panel"
```

---

### Task 8: Concepts and request explanations (TDD)

**Files:**
- Create: `client/src/concepts.js`
- Test: `client/src/concepts.test.js`

**Step 1: Write the failing test**

```js
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
```

**Step 2: Run to verify it fails**

Run: `npm test -w client`
Expected: FAIL, cannot resolve `./concepts.js`.

**Step 3: Implement `client/src/concepts.js`**

```js
// Plain-English explanations shown in the "What just happened?" panel.
// Written for students who have never heard of any of these ideas.

export const CONCEPTS = {
  http: {
    eyebrow: 'Big idea',
    title: 'HTTP REQUESTS',
    summary:
      'The browser and the server talk by sending messages called requests. Each one has a method (what to do), a URL (what to do it to), headers (extra info, like your token) and sometimes a body (the data).',
    analogy: 'Like a letter: the envelope has the address and a stamp, and the letter inside is the body.',
    tags: ['Method', 'URL', 'Headers', 'Body'],
    points: ['Every request gets a response with a status code that says how it went.'],
  },
  get: {
    eyebrow: 'HTTP method',
    title: 'GET · READ',
    summary: 'GET asks the server to show you something. Nothing on the server changes.',
    analogy: 'Like reading a menu at a restaurant: you look, but you do not order anything.',
    tags: ['Reads data', 'Safe to repeat', 'Needs login'],
    points: [
      'The browser sent your token, so the server knew whose todos to send back.',
      'The answer came back as JSON: a list of your todos.',
    ],
  },
  post: {
    eyebrow: 'HTTP method',
    title: 'POST · CREATE',
    summary: 'POST sends something new to the server to be saved.',
    analogy: 'Like mailing a letter: you send it off and the post office keeps it.',
    tags: ['Creates data', 'Not safe to repeat', 'Needs login'],
    points: [
      'The new todo travelled in the request body as JSON.',
      'The server answered 201 Created and sent back the saved todo, including the id the database gave it.',
      'Send the same POST twice and you get two todos. That is why POST is "not safe to repeat".',
    ],
  },
  patch: {
    eyebrow: 'HTTP method',
    title: 'PATCH · UPDATE',
    summary: 'PATCH changes part of something that already exists.',
    analogy: 'Like fixing a typo with correction tape: the rest of the page stays the same.',
    tags: ['Changes data', 'Needs the id', 'Needs login'],
    points: [
      "The URL ends with the todo's id, so the server knows which one to change.",
      'Only the fields that changed were sent in the body.',
    ],
    footnote: 'PUT is the sibling of PATCH. PUT replaces the whole thing, like rewriting the page. PATCH changes only the part you send.',
  },
  delete: {
    eyebrow: 'HTTP method',
    title: 'DELETE · REMOVE',
    summary: 'DELETE asks the server to remove something.',
    analogy: 'Like putting a document through a shredder: once it is gone, it is gone.',
    tags: ['Removes data', 'Needs the id', 'Needs login'],
    points: ['The server answered 204 No Content, which means "done, nothing more to say".'],
  },
  login: {
    eyebrow: 'Authentication',
    title: 'LOG IN · WHO ARE YOU?',
    summary: 'Authentication means proving who you are. You sent your email and password, and got a token back.',
    analogy: 'Like showing your ID at a club door. The bouncer checks it and gives you a wristband. The wristband is your token.',
    tags: ['Proves who you are', 'Returns a token', 'Password hidden'],
    points: [
      'This request went to Supabase Auth, a different server from our Express API.',
      'Your password is never stored as plain text. Supabase stores a scrambled version called a hash.',
      'From now on, every request carries the token in its Authorization header.',
    ],
  },
  signup: {
    eyebrow: 'Authentication',
    title: 'SIGN UP · NEW ACCOUNT',
    summary: 'Signing up creates a new account on the auth server and logs you straight in.',
    analogy: 'Like joining a gym: you fill in a form once, and they hand you a membership card.',
    tags: ['Creates an account', 'Returns a token', 'Password hidden'],
    points: ['The auth server saved a hash of your password, never the password itself.'],
  },
  refresh: {
    eyebrow: 'Authentication',
    title: 'REFRESH · NEW TOKEN',
    summary: 'Tokens expire on purpose. The app quietly swapped an old token for a fresh one.',
    analogy: 'Like a day pass that runs out at midnight: you swap it at the desk for a new one without showing your ID again.',
    tags: ['Automatic', 'Short-lived tokens', 'Security'],
    points: ['A stolen token is only useful until it expires, which limits the damage.'],
  },
  logout: {
    eyebrow: 'Authentication',
    title: 'LOG OUT',
    summary: 'Logging out tells the auth server to end your session, and the browser forgets your token.',
    analogy: 'Like handing your wristband back at the door on the way out.',
    tags: ['Ends the session', 'Token forgotten'],
  },
  whoami: {
    eyebrow: 'Authentication',
    title: 'WHO AM I?',
    summary: 'The app asked the auth server which user this token belongs to.',
    analogy: 'Like asking the front desk to read the name on your wristband.',
    tags: ['Reads your account'],
  },
  loginFailed: {
    eyebrow: 'Authentication',
    title: 'LOGIN FAILED',
    summary: 'The auth server said no. Maybe the password is wrong, or an account with that email already exists.',
    analogy: 'The bouncer turns you away, but does not say whether it was your name or your photo that did not match.',
    tags: ['Rejected', 'Deliberately vague'],
    points: ['Login errors are vague on purpose. Saying "that email exists" would help an attacker guess.'],
  },
  unauthorized: {
    eyebrow: 'Authentication',
    title: '401 · WHO ARE YOU?',
    summary: 'The server could not tell who you are, because the token was missing, fake or expired.',
    analogy: 'Like trying to get back into the club without a wristband.',
    tags: ['No valid token', 'Log in again'],
    points: ['The app sends you back to the login page.'],
  },
  authorization: {
    eyebrow: 'Authorization',
    title: 'AUTHORIZATION · BLOCKED',
    summary: 'You are logged in, but this todo is not yours, so the server refused.',
    analogy: 'Your wristband gets you into the club, but not behind the bar.',
    tags: ['You are known', 'Not allowed', 'Checked twice'],
    points: [
      'Authentication asks "who are you?". Authorization asks "what are you allowed to do?".',
      'The server answered 404 Not Found instead of 403 Forbidden, so it does not even reveal that the todo exists.',
      "Two locks stopped this: the server code checks the owner, and the database's Row Level Security checks again.",
    ],
  },
  validation: {
    eyebrow: 'Security',
    title: '400 · BAD REQUEST',
    summary: 'The server checked what you sent and rejected it.',
    analogy: 'Like a post office refusing a letter with no address.',
    tags: ['Input checked', 'Never trust the browser'],
    points: [
      'The browser checks your input too, but only to be helpful.',
      'Anyone can skip the web page and send requests directly, so the server always checks again.',
    ],
  },
  serverError: {
    eyebrow: 'Errors',
    title: 'SERVER ERROR',
    summary: 'Something broke on the server side, or the server could not be reached. It is not your fault.',
    analogy: 'The kitchen caught fire: the waiter can only apologise.',
    tags: ['Not your fault', 'Details hidden'],
    points: ['The server hides the technical details from the browser, because they can help attackers.'],
  },
  security: {
    eyebrow: 'Big idea',
    title: 'SECURITY',
    summary: 'Security means making sure only the right people can see and change the right things.',
    analogy: 'Like a building with a front desk, locked doors and cameras: several layers, so one mistake does not let everyone in.',
    tags: ['Hashed passwords', 'Expiring tokens', 'Two locks'],
    points: [
      'Passwords are stored as hashes, never as plain text.',
      'Tokens expire, so a stolen token stops working soon.',
      'The server never trusts the browser: it re-checks who you are, what you own and what you sent.',
      'Row Level Security in the database is a second lock behind the server.',
      'Secret keys live only on the server. Only PUBLIC_ settings ever reach the browser.',
    ],
  },
  state: {
    eyebrow: 'Big idea',
    title: 'STATE',
    summary: 'State is what the app is remembering right now.',
    analogy: "Like a waiter's notepad: the kitchen has the real orders, and the notepad is the waiter's copy.",
    tags: ['Server state', 'Client state'],
    points: [
      "Server state is data that really lives in the database. The todo list on screen is the app's copy of it.",
      'Client state is something only the browser knows, like text you have typed but not saved yet.',
      'When state changes, React redraws the screen. Open the State tab and watch it happen.',
    ],
  },
  token: {
    eyebrow: 'Authentication',
    title: 'TOKENS (JWT)',
    summary: 'A token is a small signed note from the auth server that says who you are. The browser shows it on every request.',
    analogy: 'Like a wristband with your name printed on it and a hologram that is impossible to fake.',
    tags: ['Signed', 'Readable by anyone', 'Expires'],
    points: [
      'Anyone can read what a token says: it is encoded, not encrypted.',
      'Nobody can change it without breaking the signature, so the server can trust it.',
      'Open the Token tab to look inside yours.',
    ],
  },
  statusCodes: {
    eyebrow: 'Big idea',
    title: 'STATUS CODES',
    summary: 'Every response starts with a three-digit number that says how it went.',
    analogy: 'Like a traffic light: you know roughly what happened before reading any details.',
    tags: ['2xx worked', '4xx your side', '5xx server side'],
    points: [
      '200 OK: here is what you asked for.',
      '201 Created: something new was saved.',
      '204 No Content: done, nothing to send back.',
      '400 Bad Request: what you sent was not valid.',
      '401 Unauthorized: who are you? Log in first.',
      '404 Not Found: there is nothing here for you.',
      '500 Server Error: the server broke.',
    ],
  },
};

// Order of the chips in the Concepts tab.
export const CONCEPT_MENU = [
  ['http', 'HTTP'],
  ['get', 'GET'],
  ['post', 'POST'],
  ['patch', 'PATCH'],
  ['delete', 'DELETE'],
  ['statusCodes', 'Status codes'],
  ['login', 'Authentication'],
  ['authorization', 'Authorization'],
  ['token', 'Tokens'],
  ['security', 'Security'],
  ['state', 'State'],
];

export const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable',
  429: 'Too Many Requests',
  500: 'Server Error',
  502: 'Bad Gateway',
};

// Where the instructor can find the code that handled each kind of request.
const CODE = {
  get: "server/src/routes/todos.js → router.get('/')",
  post: "server/src/routes/todos.js → router.post('/')",
  patch: "server/src/routes/todos.js → router.patch('/:id')",
  delete: "server/src/routes/todos.js → router.delete('/:id')",
  unauthorized: 'server/src/middleware/requireAuth.js → requireAuth()',
  authorization: 'server/src/routes/todos.js → notYours()',
  validation: 'server/src/validate.js',
  serverError: 'server/src/errors.js → errorHandler()',
  login: 'client/src/components/LoginScreen.jsx → supabase.auth.signInWithPassword()',
  signup: 'client/src/components/LoginScreen.jsx → supabase.auth.signUp()',
  loginFailed: 'client/src/components/LoginScreen.jsx → friendlyAuthError()',
  logout: 'client/src/components/TodoScreen.jsx → supabase.auth.signOut()',
  refresh: 'Built into @supabase/supabase-js, which refreshes tokens automatically',
  whoami: 'Built into @supabase/supabase-js',
};

const METHOD_CONCEPTS = { GET: 'get', POST: 'post', PATCH: 'patch', DELETE: 'delete' };

function conceptKeyFor({ method, path, search = '', status, error }) {
  if (path.startsWith('/auth/v1/')) {
    if (path.endsWith('/logout')) return 'logout';
    if (error || status >= 400) return 'loginFailed';
    if (path.endsWith('/signup')) return 'signup';
    if (path.endsWith('/token')) return search.includes('grant_type=refresh_token') ? 'refresh' : 'login';
    return 'whoami';
  }
  if (error || status >= 500) return 'serverError';
  if (status === 401) return 'unauthorized';
  if (status === 404 && (method === 'PATCH' || method === 'DELETE')) return 'authorization';
  if (status === 400) return 'validation';
  return METHOD_CONCEPTS[method] ?? 'http';
}

// Turns a recorded request into the concept that explains it.
export function explainRecord(record) {
  const key = conceptKeyFor(record);
  return { key, concept: CONCEPTS[key], code: CODE[key] ?? null };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -w client`
Expected: PASS.

**Step 5: Lint and commit**

```bash
npm run lint
git add client/src/concepts.js client/src/concepts.test.js
git commit -m "feat(client): add beginner-friendly concept definitions and request explainer"
```

---

### Task 9: Illustrations and UI icons (TDD for icon choice)

**Files:**
- Create: `client/src/icons.jsx`
- Test: `client/src/icons.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, pickIcon } from './icons.jsx';

describe('pickIcon', () => {
  it.each([
    ['Reading books', 'book'],
    ['Study for exam', 'book'],
    ['Painting', 'palette'],
    ['Save money', 'jar'],
    ['Climb mountains', 'mountain'],
    ['Buy milk', 'cart'],
    ['Workout at the gym', 'dumbbell'],
    ['Code the project', 'laptop'],
    ['Water the plants', 'plant'],
  ])('picks an icon from keywords in "%s"', (title, icon) => {
    expect(pickIcon(title, 'any-id')).toBe(icon);
  });

  it('falls back to a stable icon based on the id', () => {
    const first = pickIcon("Bob's secret plan", '00000000-0000-4000-8000-000000000b0b');
    expect(ICON_NAMES).toContain(first);
    expect(pickIcon("Bob's secret plan", '00000000-0000-4000-8000-000000000b0b')).toBe(first);
  });

  it('uses the star while nothing is known yet', () => {
    expect(pickIcon('', '')).toBe('star');
  });
});
```

**Step 2: Run to verify it fails**

Run: `npm test -w client`
Expected: FAIL, cannot resolve `./icons.jsx`.

**Step 3: Implement `client/src/icons.jsx`**

```jsx
// Flat, colourful illustrations in the style of the reference mock.
// Each one is drawn on a 64 x 64 grid.

const ART = {
  book: (
    <>
      <rect x="12" y="10" width="30" height="42" rx="4" fill="#90CAF9" />
      <rect x="15" y="8" width="30" height="42" rx="4" fill="#42A5F5" />
      <rect x="20" y="15" width="20" height="9" rx="2" fill="#BBDEFB" />
      <rect x="20" y="29" width="14" height="3" rx="1.5" fill="#BBDEFB" />
      <rect x="20" y="35" width="10" height="3" rx="1.5" fill="#BBDEFB" />
      <path d="M40 44 54 22l5 3-14 22-6 2z" fill="#FFB74D" />
      <path d="M54 22l2.5-4 5 3-2.5 4z" fill="#F06292" />
      <circle cx="8" cy="18" r="2" fill="#FFD54F" />
      <circle cx="56" cy="52" r="2.5" fill="#4DD0E1" />
    </>
  ),
  palette: (
    <>
      <path d="M32 10C18 10 8 20 8 32s9 22 20 22c4 0 5-3 3-6-2-3 0-6 4-6h6c9 0 15-6 15-13 0-11-11-19-24-19z" fill="#FFF3E0" />
      <circle cx="21" cy="24" r="4" fill="#EF5350" />
      <circle cx="32" cy="19" r="4" fill="#42A5F5" />
      <circle cx="43" cy="24" r="4" fill="#FFCA28" />
      <circle cx="18" cy="36" r="4" fill="#66BB6A" />
      <path d="M44 52 58 34l3 2-13 19z" fill="#8D6E63" />
      <path d="M42 54c1-3 3-4 5-3l1 1c0 3-3 4-6 2z" fill="#AB47BC" />
      <circle cx="56" cy="12" r="2" fill="#F06292" />
    </>
  ),
  jar: (
    <>
      <rect x="18" y="8" width="28" height="7" rx="3" fill="#FFB74D" />
      <path d="M16 20c0-3 3-5 6-5h20c3 0 6 2 6 5v26c0 5-4 9-9 9H25c-5 0-9-4-9-9z" fill="#80DEEA" />
      <path d="M16 32h32v14c0 5-4 9-9 9H25c-5 0-9-4-9-9z" fill="#4DD0E1" />
      <circle cx="32" cy="40" r="7" fill="#FFCA28" />
      <path d="M32 36l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#FF8F00" />
      <circle cx="10" cy="14" r="2" fill="#F06292" />
      <circle cx="54" cy="10" r="1.5" fill="#FFD54F" />
    </>
  ),
  mountain: (
    <>
      <path d="M4 54 24 22l20 32z" fill="#42A5F5" />
      <path d="M24 22l-6 10 3 2 3-3 3 3 3-2z" fill="#E3F2FD" />
      <path d="M26 54 44 28l16 26z" fill="#1E88E5" />
      <path d="M44 28l-5 7 2.5 1.5 2.5-2.5 2.5 2.5 2.5-1.5z" fill="#E3F2FD" />
      <path d="M44 28V14" stroke="#FFCA28" strokeWidth="2" />
      <path d="M44 14h9l-3 3 3 3h-9z" fill="#F06292" />
      <circle cx="10" cy="20" r="2" fill="#FFD54F" />
    </>
  ),
  cart: (
    <>
      <path d="M6 12h8l6 28h28l6-20H18" fill="none" stroke="#FFB74D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="20" width="10" height="14" rx="2" fill="#42A5F5" />
      <rect x="34" y="16" width="10" height="18" rx="2" fill="#66BB6A" />
      <circle cx="48" cy="26" r="5" fill="#EF5350" />
      <circle cx="24" cy="50" r="4" fill="#E3F2FD" />
      <circle cx="44" cy="50" r="4" fill="#E3F2FD" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="18" y="29" width="28" height="6" rx="3" fill="#B0BEC5" />
      <rect x="8" y="18" width="8" height="28" rx="3" fill="#EF5350" />
      <rect x="48" y="18" width="8" height="28" rx="3" fill="#EF5350" />
      <rect x="14" y="22" width="6" height="20" rx="2" fill="#FFB74D" />
      <rect x="44" y="22" width="6" height="20" rx="2" fill="#FFB74D" />
      <circle cx="32" cy="12" r="2" fill="#FFD54F" />
      <circle cx="54" cy="54" r="2" fill="#4DD0E1" />
    </>
  ),
  laptop: (
    <>
      <rect x="12" y="14" width="40" height="28" rx="3" fill="#E3F2FD" />
      <rect x="15" y="17" width="34" height="22" rx="1.5" fill="#1E88E5" />
      <path d="M24 24l-4 4 4 4M40 24l4 4-4 4M34 22l-4 12" fill="none" stroke="#FFCA28" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 44h52l-4 6H10z" fill="#90CAF9" />
      <circle cx="56" cy="10" r="2" fill="#F06292" />
    </>
  ),
  plant: (
    <>
      <path d="M20 38h24l-3 16H23z" fill="#FFB74D" />
      <rect x="18" y="34" width="28" height="6" rx="2" fill="#FF8A65" />
      <path d="M32 34V18" stroke="#43A047" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 22c-10 0-14-6-14-12 8 0 14 4 14 12z" fill="#66BB6A" />
      <path d="M32 26c8 0 13-5 13-11-7 0-13 4-13 11z" fill="#81C784" />
      <circle cx="50" cy="40" r="2" fill="#4DD0E1" />
      <circle cx="12" cy="22" r="2" fill="#FFD54F" />
    </>
  ),
  star: (
    <>
      <path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill="#FFCA28" />
      <path d="M32 16l4 9 10 1-7 7 2 10-9-5z" fill="#FFE082" />
      <circle cx="10" cy="50" r="2" fill="#F06292" />
      <circle cx="54" cy="50" r="2.5" fill="#4DD0E1" />
    </>
  ),
  lock: (
    <>
      <path d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#90CAF9" strokeWidth="5" />
      <rect x="12" y="28" width="40" height="28" rx="6" fill="#FFCA28" />
      <circle cx="32" cy="40" r="4" fill="#F57C00" />
      <rect x="30.5" y="41" width="3" height="8" rx="1.5" fill="#F57C00" />
      <circle cx="8" cy="16" r="2" fill="#F06292" />
      <circle cx="56" cy="20" r="2" fill="#4DD0E1" />
    </>
  ),
};

// Icons a todo can get. Keywords are checked in this order.
export const ICON_NAMES = ['book', 'palette', 'jar', 'mountain', 'cart', 'dumbbell', 'laptop', 'plant'];

const KEYWORDS = [
  [/\b(read|book|study|learn|homework)/i, 'book'],
  [/\b(paint|draw|art|design|sketch)/i, 'palette'],
  [/\b(sav|money|budget|pay|bank)/i, 'jar'],
  [/\b(climb|hike|mountain|walk|run|trip|travel)/i, 'mountain'],
  [/\b(buy|shop|milk|grocer|food|cook)/i, 'cart'],
  [/\b(gym|workout|exercise|lift|yoga|train)/i, 'dumbbell'],
  [/\b(code|build|project|work|email|write)/i, 'laptop'],
  [/\b(water|plant|garden|clean)/i, 'plant'],
];

export function pickIcon(title = '', id = '') {
  const match = KEYWORDS.find(([pattern]) => pattern.test(title));
  if (match) return match[1];
  if (!id) return 'star';
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  return ICON_NAMES[hash % ICON_NAMES.length];
}

export function Illustration({ name, className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {ART[name]}
    </svg>
  );
}

export function TodoIcon({ title, id, className }) {
  return <Illustration name={pickIcon(title, id)} className={className} />;
}

// Small line icons for buttons. They use the current text colour.
function LineIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CheckIcon = () => <LineIcon><path d="M5 12.5l4.5 4.5L19 7.5" /></LineIcon>;
export const TrashIcon = () => <LineIcon><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></LineIcon>;
export const LogoutIcon = () => <LineIcon><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></LineIcon>;
export const BackIcon = () => <LineIcon><path d="M19 12H5M11 6l-6 6 6 6" /></LineIcon>;
```

**Step 4: Run tests to verify they pass**

Run: `npm test -w client`
Expected: PASS.
If "Save money" matches the wrong rule, check the order of `KEYWORDS`; the first match wins.

**Step 5: Lint and commit**

```bash
npm run lint
git add client/src/icons.jsx client/src/icons.test.js
git commit -m "feat(client): add mock-style illustrations and keyword icon picker"
```

---

### Task 10: Supabase client and API wrapper

**Files:**
- Create: `client/src/supabaseClient.js`, `client/src/api.js`

**Step 1: `client/src/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';
import { loggedFetch } from './requestLog.js';

// The browser only ever sees PUBLIC_ settings (see vite.config.js).
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    // Send Supabase's own network calls through our logger, so logging in shows up in the panel too.
    global: { fetch: loggedFetch },
  },
);
```

**Step 2: `client/src/api.js`**

```js
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
```

**Step 3: Lint, build and commit**

```bash
npm run lint
npm run build -w client
git add client/src/supabaseClient.js client/src/api.js
git commit -m "feat(client): add Supabase client and logged todos API"
```

---

### Task 11: Teaching panel components (TDD for entry and token)

**Files:**
- Create: `client/src/components/ConceptBody.jsx`, `client/src/components/RequestEntry.jsx`, `client/src/components/TokenPeek.jsx`, `client/src/components/StateInspector.jsx`, `client/src/components/LearnPanel.jsx`
- Test: `client/src/components/RequestEntry.test.jsx`, `client/src/components/TokenPeek.test.jsx`

**Step 1: Write the failing tests**

`client/src/components/RequestEntry.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RequestEntry from './RequestEntry.jsx';

const postRecord = {
  id: 1,
  method: 'POST',
  url: '/api/todos',
  path: '/api/todos',
  search: '',
  requestHeaders: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIs…', 'content-type': 'application/json' },
  requestBody: { title: 'Read' },
  status: 201,
  responseBody: { id: 'abc', title: 'Read' },
  error: null,
  durationMs: 42,
};

describe('RequestEntry', () => {
  it('explains a POST in plain English', () => {
    render(<RequestEntry record={postRecord} />);
    expect(screen.getByRole('heading', { name: 'POST · CREATE' })).toBeInTheDocument();
    expect(screen.getByText('201 Created')).toBeInTheDocument();
    expect(screen.getByText(/Like mailing a letter/)).toBeInTheDocument();
    expect(screen.getByText("server/src/routes/todos.js → router.post('/')")).toBeInTheDocument();
  });

  it('points out the token header', () => {
    render(<RequestEntry record={postRecord} />);
    expect(screen.getByText(/This is your wristband/)).toBeInTheDocument();
  });

  it('shows a network failure', () => {
    render(<RequestEntry record={{ ...postRecord, status: null, responseBody: null, error: 'Failed to fetch' }} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SERVER ERROR' })).toBeInTheDocument();
  });
});
```

`client/src/components/TokenPeek.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TokenPeek, { decodeJwt } from './TokenPeek.jsx';

const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const payload = { sub: 'user-123', email: 'alice@demo.test', role: 'authenticated', iat: 1999996400, exp: 2000000000 };
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-goes-here`;

describe('decodeJwt', () => {
  it('reads the header and payload', () => {
    const decoded = decodeJwt(token);
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decoded.payload).toEqual(payload);
  });
});

describe('TokenPeek', () => {
  it('shows what is inside the token', () => {
    render(<TokenPeek token={token} />);
    expect(screen.getByRole('cell', { name: 'user-123' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'alice@demo.test' })).toBeInTheDocument();
    expect(screen.getByText(/encoded, not encrypted/)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify they fail**

Run: `npm test -w client`
Expected: FAIL, cannot resolve the component files.

**Step 3: `client/src/components/ConceptBody.jsx`**

```jsx
// The shared "explanation" part of every panel card:
// summary, analogy, key-fact chips, extra points and an optional footnote.
export default function ConceptBody({ concept }) {
  return (
    <>
      <p className="summary">{concept.summary}</p>
      <p className="analogy">
        <span className="analogy-icon" aria-hidden="true">💡</span>
        <span>{concept.analogy}</span>
      </p>
      {concept.tags?.length > 0 && (
        <ul className="tags" aria-label="Key facts">
          {concept.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}
      {concept.points?.length > 0 && (
        <ul className="points">
          {concept.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      )}
      {concept.footnote && <p className="footnote">{concept.footnote}</p>}
    </>
  );
}
```

**Step 4: `client/src/components/RequestEntry.jsx`**

```jsx
import { explainRecord, STATUS_TEXT } from '../concepts.js';
import ConceptBody from './ConceptBody.jsx';

const HEADER_NOTES = {
  authorization: 'This is your wristband: the token that proves who you are.',
  apikey: "The app's publishable key. It identifies the app, not you, so it is safe to be public.",
};

const KNOWN_METHODS = ['get', 'post', 'patch', 'delete'];

function pretty(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function StatusChip({ record }) {
  if (record.error) return <span className="status status-bad">Network error</span>;
  const tone = record.status < 300 ? 'ok' : record.status < 500 ? 'warn' : 'bad';
  return <span className={`status status-${tone}`}>{`${record.status} ${STATUS_TEXT[record.status] ?? ''}`.trim()}</span>;
}

export function MethodBadge({ method }) {
  const name = method.toLowerCase();
  return <span className={`method method-${KNOWN_METHODS.includes(name) ? name : 'other'}`}>{method}</span>;
}

function HeaderList({ headers }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) return <p className="footnote">No headers.</p>;
  return (
    <ul className="header-list">
      {entries.map(([key, value]) => (
        <li key={key} className={HEADER_NOTES[key] ? 'highlight' : undefined}>
          <span className="key">{key}:</span> {value}
          {HEADER_NOTES[key] && <span className="header-note">{HEADER_NOTES[key]}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function RequestEntry({ record }) {
  const { concept, code } = explainRecord(record);
  const response = record.error ? `No response: ${record.error}` : (pretty(record.responseBody) ?? '(empty)');

  return (
    <article className="entry">
      <p className="eyebrow">{concept.eyebrow}</p>
      <h3 className="entry-title">{concept.title}</h3>
      <div className="entry-meta">
        <MethodBadge method={record.method} />
        <code className="route">{record.url}</code>
        <StatusChip record={record} />
        <span className="duration">{record.durationMs} ms</span>
      </div>

      <ConceptBody concept={concept} />

      {code && (
        <p className="code-pointer">
          <span>Where in code</span>
          <code>{code}</code>
        </p>
      )}

      <details className="raw">
        <summary>See the full request and response</summary>
        <div className="raw-body">
          <h4>Request headers</h4>
          <HeaderList headers={record.requestHeaders} />
          {record.requestBody != null && (
            <>
              <h4>Request body</h4>
              <pre>{pretty(record.requestBody)}</pre>
            </>
          )}
          <h4>Response</h4>
          <pre>{response}</pre>
        </div>
      </details>
    </article>
  );
}
```

**Step 5: `client/src/components/TokenPeek.jsx`**

```jsx
import { useState } from 'react';

function decodePart(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
}

// A JWT is three base64url parts joined by dots: header.payload.signature
export function decodeJwt(token) {
  const [header, payload, signature] = token.split('.');
  return { parts: { header, payload, signature }, header: decodePart(header), payload: decodePart(payload) };
}

const FIELD_NOTES = {
  sub: 'Your user id (the "subject"). The server uses it to find your todos.',
  email: 'The email you logged in with.',
  role: '"authenticated" means a logged-in user. The database security rules check this.',
  iat: 'When this token was issued.',
  exp: 'When this token stops working.',
  aud: 'Who the token is meant for (the "audience").',
  session_id: 'Which login session this token belongs to.',
};

const TIME_FIELDS = new Set(['iat', 'exp']);

function shorten(text) {
  return text.length > 28 ? `${text.slice(0, 24)}…` : text;
}

export default function TokenPeek({ token }) {
  const [now] = useState(() => Date.now());
  const { parts, payload } = decodeJwt(token);
  const minutesLeft = Math.max(0, Math.round((payload.exp * 1000 - now) / 60_000));

  return (
    <div className="token-peek">
      <p className="eyebrow">Authentication</p>
      <h3 className="entry-title">YOUR TOKEN (JWT)</h3>
      <p className="summary">
        This is the wristband your browser shows the server on every request. It has three parts, separated by dots.
      </p>

      <p className="jwt" aria-label="Your token, split into its three parts">
        <span className="jwt-header">{shorten(parts.header)}</span>.
        <span className="jwt-payload">{shorten(parts.payload)}</span>.
        <span className="jwt-signature">{shorten(parts.signature)}</span>
      </p>
      <ul className="jwt-legend">
        <li><span className="swatch jwt-header-bg" /> <strong>Header:</strong> what kind of token this is.</li>
        <li><span className="swatch jwt-payload-bg" /> <strong>Payload:</strong> facts about you, decoded below.</li>
        <li><span className="swatch jwt-signature-bg" /> <strong>Signature:</strong> a seal only the auth server can make. Change one letter and the seal breaks.</li>
      </ul>

      <table className="claims">
        <tbody>
          {Object.keys(FIELD_NOTES)
            .filter((key) => payload[key] !== undefined)
            .map((key) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td className="value">
                  {TIME_FIELDS.has(key) ? new Date(payload[key] * 1000).toLocaleTimeString() : String(payload[key])}
                </td>
                <td>{FIELD_NOTES[key]}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <p className="callout">
        Anyone can read the payload: it is encoded, not encrypted. Never put secrets in a token. What makes it
        trustworthy is the signature.
      </p>
      <p className="footnote">This token expires in about {minutesLeft} minutes. The app will quietly fetch a new one.</p>
    </div>
  );
}
```

**Step 6: `client/src/components/StateInspector.jsx`**

```jsx
// Shows what the app is remembering right now.
// Each value re-mounts when it changes (key={json}), which replays the flash animation.
function StateRow({ label, kind, value, note }) {
  const json = JSON.stringify(value, null, 2) ?? 'null';
  return (
    <section className="state-row">
      <header>
        <span className="state-label">{label}</span>
        <span className={`state-kind ${kind}`}>{kind === 'server' ? 'Server state' : 'Client state'}</span>
      </header>
      <p className="state-note">{note}</p>
      <pre key={json} className="state-value flash">{json}</pre>
    </section>
  );
}

export default function StateInspector({ state, lastRequest }) {
  const lastRequestSummary = lastRequest
    ? `${lastRequest.method} ${lastRequest.url} → ${lastRequest.status ?? 'failed'}`
    : null;

  return (
    <div className="state-inspector">
      <p className="eyebrow">Big idea</p>
      <h3 className="entry-title">STATE</h3>
      <p className="summary">What the app is remembering right now. A row flashes when it changes.</p>
      <StateRow label="user" kind="server" value={state.user} note="Who is logged in. It comes from the auth server." />
      <StateRow label="todos" kind="server" value={state.todos} note="The app's copy of your todos. The real ones live in the database." />
      <StateRow label="modal" kind="client" value={state.modal} note="Whether the task window is open. Only this browser knows." />
      <StateRow label="draft" kind="client" value={state.draft} note="What you are typing. It is not saved anywhere until you press Finish." />
      <StateRow label="lastRequest" kind="client" value={lastRequestSummary} note="The most recent message sent to a server." />
    </div>
  );
}
```

**Step 7: `client/src/components/LearnPanel.jsx`**

```jsx
import { useState } from 'react';
import { CONCEPT_MENU, CONCEPTS } from '../concepts.js';
import { Illustration } from '../icons.jsx';
import { useRequestLog } from '../requestLog.js';
import ConceptBody from './ConceptBody.jsx';
import RequestEntry, { MethodBadge, StatusChip } from './RequestEntry.jsx';
import StateInspector from './StateInspector.jsx';
import TokenPeek from './TokenPeek.jsx';

function Welcome({ signedIn }) {
  return (
    <div className="welcome">
      <Illustration name="star" className="welcome-art" />
      <p className="eyebrow">Start here</p>
      <h3 className="entry-title">WELCOME</h3>
      <p className="summary">Every time this app talks to a server, this panel explains what happened, in plain English.</p>
      <p>{signedIn ? 'Add, tick, edit or delete a task and watch this space.' : 'Log in or sign up on the left to send your first request.'}</p>
    </div>
  );
}

function History({ records, selectedId, onSelect }) {
  return (
    <section className="history" aria-label="Earlier requests">
      <h4>Earlier requests</h4>
      <ol>
        {records.map((record) => (
          <li key={record.id}>
            <button type="button" aria-pressed={record.id === selectedId} onClick={() => onSelect(record.id)}>
              <MethodBadge method={record.method} />
              <span className="route-text">{record.url}</span>
              <StatusChip record={record} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ConceptsBrowser({ selected, onSelect }) {
  const concept = CONCEPTS[selected];
  return (
    <>
      <div className="concept-chips">
        {CONCEPT_MENU.map(([key, label]) => (
          <button key={key} type="button" className="concept-chip" aria-pressed={key === selected} onClick={() => onSelect(key)}>
            {label}
          </button>
        ))}
      </div>
      <p className="eyebrow">{concept.eyebrow}</p>
      <h3 className="entry-title">{concept.title}</h3>
      <ConceptBody concept={concept} />
    </>
  );
}

// The right-hand "What just happened?" panel.
// `inspect` (the app's state) and `session` are only passed once someone is logged in.
export default function LearnPanel({ tab, onTabChange, session, inspect }) {
  const records = useRequestLog();
  const latest = records[0];
  // Remember which older request the user clicked, but jump back to the newest one when a new request arrives.
  const [pick, setPick] = useState(null);
  const [conceptKey, setConceptKey] = useState('http');
  const selected = (pick?.latestId === latest?.id && records.find((record) => record.id === pick.id)) || latest;

  const tabs = [['live', 'Live'], inspect && ['state', 'State'], session && ['token', 'Token'], ['concepts', 'Concepts']].filter(Boolean);
  const activeTab = tabs.some(([key]) => key === tab) ? tab : 'live';

  return (
    <aside className="learn-panel" aria-label="What just happened?">
      <div className="panel-top">
        <h2 className="panel-heading">What just happened?</h2>
        <div role="tablist" className="tabs" aria-label="Panel views">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" className="tab" aria-selected={activeTab === key} onClick={() => onTabChange(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body" role="tabpanel">
        {activeTab === 'live' && (selected ? <RequestEntry record={selected} /> : <Welcome signedIn={Boolean(session)} />)}
        {activeTab === 'live' && records.length > 1 && (
          <History records={records} selectedId={selected.id} onSelect={(id) => setPick({ id, latestId: latest.id })} />
        )}
        {activeTab === 'state' && <StateInspector state={inspect} lastRequest={latest} />}
        {activeTab === 'token' && <TokenPeek token={session.access_token} />}
        {activeTab === 'concepts' && <ConceptsBrowser selected={conceptKey} onSelect={setConceptKey} />}
      </div>
    </aside>
  );
}
```

**Step 8: Run tests to verify they pass**

Run: `npm test -w client`
Expected: PASS.

**Step 9: Lint and commit**

```bash
npm run lint
git add client/src/components
git commit -m "feat(client): add teaching panel with live requests, state, token and concepts"
```

---

### Task 12: Login screen and app shell

**Files:**
- Create: `client/src/components/LoginScreen.jsx`
- Modify: `client/src/App.jsx` (replace the placeholder)

**Step 1: `client/src/components/LoginScreen.jsx`**

```jsx
import { useState } from 'react';
import { DEMO_PASSWORD, DEMO_USERS } from '../../../shared/constants.js';
import { Illustration } from '../icons.jsx';
import { supabase } from '../supabaseClient.js';
import LearnPanel from './LearnPanel.jsx';

// Turns Supabase's error codes into friendly sentences.
export function friendlyAuthError(error) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'That email and password do not match an account.';
    case 'user_already_exists':
      return 'An account with that email already exists. Try logging in instead.';
    default:
      return error.message;
  }
}

export default function LoginScreen() {
  // CLIENT STATE: what is typed into the form. Nothing is sent until a button is pressed.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState('live');

  async function submit(kind) {
    setBusy(true);
    setMessage(null);
    setTab('live');
    const credentials = { email: email.trim(), password };
    // AUTHENTICATION: send the email and password to Supabase Auth and get a token back.
    const { data, error } =
      kind === 'login' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (error) setMessage(friendlyAuthError(error));
    else if (!data.session) setMessage('Check your inbox to confirm your email, then log in.');
    // On success, App sees the new session and shows the todo screen.
  }

  return (
    <main className="layout">
      <section className="phone login">
        <Illustration name="lock" className="login-art" />
        <p className="eyebrow on-blue">Welcome</p>
        <h1>Log in</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit('login');
          }}
        >
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="banner error" role="alert">{message}</p>}
          <div className="login-actions">
            <button type="submit" className="primary" disabled={busy}>Log in</button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={(event) => {
                if (event.currentTarget.form.reportValidity()) submit('signup');
              }}
            >
              Sign up
            </button>
          </div>
        </form>
        <p className="demo-hint">
          Demo accounts: <code>{DEMO_USERS.alice.email}</code> and <code>{DEMO_USERS.bob.email}</code>, password <code>{DEMO_PASSWORD}</code>
        </p>
      </section>
      <LearnPanel tab={tab} onTabChange={setTab} session={null} />
    </main>
  );
}
```

**Step 2: `client/src/App.jsx`**

```jsx
import { useEffect, useState } from 'react';
import LoginScreen from './components/LoginScreen.jsx';
import TodoScreen from './components/TodoScreen.jsx';
import { supabase } from './supabaseClient.js';

export default function App() {
  // undefined means "still checking whether someone is already logged in".
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    // Fires on log in, log out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <TodoScreen key={session.user.id} session={session} /> : <LoginScreen />;
}
```

`TodoScreen` is created in Task 13, so this task is committed together with Task 13.

---

### Task 13: Todo screen, card and task modal

**Files:**
- Create: `client/src/components/TodoScreen.jsx`, `client/src/components/TodoCard.jsx`, `client/src/components/TaskModal.jsx`

**Step 1: `client/src/components/TodoCard.jsx`**

```jsx
import { CheckIcon, TodoIcon, TrashIcon } from '../icons.jsx';

export default function TodoCard({ todo, onToggle, onEdit, onDelete }) {
  return (
    <li className={`todo-card${todo.done ? ' done' : ''}`}>
      <TodoIcon title={todo.title} id={todo.id} className="todo-icon" />
      <button type="button" className="todo-text" aria-label={`Edit ${todo.title}`} onClick={() => onEdit(todo)}>
        <span className="todo-title">{todo.title}</span>
        {todo.note && <span className="todo-note">{todo.note}</span>}
      </button>
      <button type="button" className="delete-button" aria-label={`Delete ${todo.title}`} onClick={() => onDelete(todo)}>
        <TrashIcon />
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={`Mark ${todo.title} as done`}
        className={`check${todo.done ? ' checked' : ''}`}
        onClick={() => onToggle(todo)}
      >
        {todo.done && <CheckIcon />}
      </button>
    </li>
  );
}
```

**Step 2: `client/src/components/TaskModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { MAX_TEXT_LENGTH } from '../../../shared/constants.js';
import { BackIcon, TodoIcon } from '../icons.jsx';

// Checks input in the browser, only to be helpful. The server checks again to be safe.
function findProblem(draft) {
  if (!draft.title.trim()) return 'Give your task a name.';
  if (draft.title.trim().length > MAX_TEXT_LENGTH) return `Keep the name under ${MAX_TEXT_LENGTH} characters.`;
  if (draft.note.trim().length > MAX_TEXT_LENGTH) return `Keep the note under ${MAX_TEXT_LENGTH} characters.`;
  return null;
}

export default function TaskModal({ mode, todoId, draft, onChange, onSave, onClose }) {
  const [saving, setSaving] = useState(false);
  const problem = findProblem(draft);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    if (problem) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal-art">
          <button type="button" className="back-button" aria-label="Close" onClick={onClose}>
            <BackIcon />
          </button>
          {/* The picture updates as you type: a small, visible example of state changing. */}
          <TodoIcon title={draft.title} id={todoId ?? ''} className="modal-icon" />
        </div>
        <div className="modal-card">
          <p className="eyebrow" id="modal-title">{mode === 'new' ? 'New task' : 'Edit task'}</p>
          <label className="sr-only" htmlFor="task-title">Task name</label>
          <input
            id="task-title"
            className="title-input"
            placeholder="Task name"
            autoComplete="off"
            autoFocus
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
          <label className="field-label" htmlFor="task-note">Note</label>
          <input
            id="task-note"
            className="note-input"
            placeholder="e.g. Read every day"
            autoComplete="off"
            value={draft.note}
            onChange={(event) => onChange({ ...draft, note: event.target.value })}
          />
          <p className={`hint${problem ? '' : ' subtle'}`}>
            {problem ?? 'The browser checks this to be helpful. The server checks it again to be safe.'}
          </p>
        </div>
        <button type="submit" className="primary" disabled={Boolean(problem) || saving}>
          {saving ? 'Saving…' : 'Finish'}
        </button>
      </form>
    </div>
  );
}
```

**Step 3: `client/src/components/TodoScreen.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react';
import { foreignTodoId } from '../../../shared/constants.js';
import { todosApi } from '../api.js';
import { LogoutIcon } from '../icons.jsx';
import { supabase } from '../supabaseClient.js';
import LearnPanel from './LearnPanel.jsx';
import TaskModal from './TaskModal.jsx';
import TodoCard from './TodoCard.jsx';

const EMPTY_DRAFT = { title: '', note: '' };

function ordinal(day) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const lastTwo = day % 100;
  return day + (suffixes[(lastTwo - 20) % 10] || suffixes[lastTwo] || suffixes[0]);
}

// A 401 means the token is missing or expired: forget it and return to the login page.
// Anything else is shown to the user as a banner.
async function handleFailure(error, setBanner) {
  if (error.status === 401) {
    await supabase.auth.signOut({ scope: 'local' });
    return;
  }
  setBanner({ tone: 'error', text: error.message });
}

export default function TodoScreen({ session }) {
  // SERVER STATE: our copy of the todos that live in the database.
  const [todos, setTodos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // CLIENT STATE: things only this browser knows about.
  const [modal, setModal] = useState(null); // null, { mode: 'new' } or { mode: 'edit', todo }
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [banner, setBanner] = useState(null);
  const [tab, setTab] = useState('live');
  const [today] = useState(() => new Date());

  // GET: load this user's todos once, when the screen first appears.
  useEffect(() => {
    let active = true;
    todosApi
      .list()
      .then((list) => active && setTodos(list))
      .catch((error) => active && handleFailure(error, setBanner))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  async function attempt(action) {
    setBanner(null);
    try {
      return { ok: true, value: await action() };
    } catch (error) {
      await handleFailure(error, setBanner);
      return { ok: false };
    }
  }

  const replaceTodo = (updated) => setTodos((list) => list.map((todo) => (todo.id === updated.id ? updated : todo)));

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setModal({ mode: 'new' });
  }

  function openEdit(todo) {
    setDraft({ title: todo.title, note: todo.note });
    setModal({ mode: 'edit', todo });
  }

  const closeModal = useCallback(() => {
    setModal(null);
    setDraft(EMPTY_DRAFT);
  }, []);

  async function saveDraft() {
    if (modal.mode === 'new') {
      // POST: send the new todo to be saved.
      const result = await attempt(() => todosApi.create(draft));
      if (!result.ok) return;
      setTodos((list) => [...list, result.value]);
    } else {
      // PATCH: send the fields that can change.
      const result = await attempt(() => todosApi.update(modal.todo.id, draft));
      if (!result.ok) return;
      replaceTodo(result.value);
    }
    closeModal();
  }

  async function toggle(todo) {
    // PATCH: change just one field.
    const result = await attempt(() => todosApi.update(todo.id, { done: !todo.done }));
    if (result.ok) replaceTodo(result.value);
  }

  async function remove(todo) {
    // DELETE: ask the server to remove it, then forget our copy.
    const result = await attempt(() => todosApi.remove(todo.id));
    if (result.ok) setTodos((list) => list.filter((item) => item.id !== todo.id));
  }

  async function trySomeoneElses() {
    // AUTHORIZATION demo: we are logged in, but this todo belongs to another user.
    setTab('live');
    setBanner(null);
    try {
      await todosApi.update(foreignTodoId(session.user.email), { title: 'Hacked!' });
      setBanner({ tone: 'error', text: 'Uh oh: the server allowed it. Authorization is broken!' });
    } catch (error) {
      if (error.status === 404) {
        setBanner({ tone: 'info', text: 'Blocked! The server refused to change a todo that is not yours.' });
      } else {
        await handleFailure(error, setBanner);
      }
    }
  }

  const email = session.user.email;

  return (
    <>
      <main className="layout">
        <section className="phone">
          <header className="phone-header">
            <p className="date">
              <span>{today.getFullYear()}</span>
              <span>
                {today.toLocaleString('en-US', { month: 'long' })} {ordinal(today.getDate())}
              </span>
            </p>
            <div className="user-actions">
              <span className="avatar" aria-hidden="true">{email[0].toUpperCase()}</span>
              <button type="button" className="icon-button" aria-label="Log out" onClick={() => supabase.auth.signOut()}>
                <LogoutIcon />
              </button>
            </div>
          </header>
          <p className="signed-in-as">Signed in as {email}</p>

          {banner && (
            <p className={`banner ${banner.tone}`} role={banner.tone === 'error' ? 'alert' : 'status'}>
              {banner.text}
            </p>
          )}

          {todos.length > 0 && (
            <ul className="todo-list">
              {todos.map((todo) => (
                <TodoCard key={todo.id} todo={todo} onToggle={toggle} onEdit={openEdit} onDelete={remove} />
              ))}
            </ul>
          )}
          {loaded && todos.length === 0 && (
            <p className="empty">No tasks yet. Add one to send your first POST request.</p>
          )}

          <button type="button" className="primary" onClick={openNew}>Add new task</button>
          <button type="button" className="demo-button" onClick={trySomeoneElses}>
            Try to edit someone else&apos;s todo
          </button>
        </section>

        <LearnPanel
          tab={tab}
          onTabChange={setTab}
          session={session}
          inspect={{ user: { id: session.user.id, email }, todos, modal, draft }}
        />
      </main>

      {modal && (
        <TaskModal
          mode={modal.mode}
          todoId={modal.todo?.id}
          draft={draft}
          onChange={setDraft}
          onSave={saveDraft}
          onClose={closeModal}
        />
      )}
    </>
  );
}
```

**Step 4: Lint, test and build**

Run: `npm run lint && npm test -w client && npm run build -w client`
Expected: all pass.
If the React Hooks lint rules flag something (for example purity rules), fix the code rather than disabling the rule.

**Step 5: Commit Tasks 12 and 13 together**

```bash
git add client/src
git commit -m "feat(client): add login, todo list and task modal screens"
```

---

### Task 14: Styles that follow the mock

**Files:**
- Modify: `client/src/styles.css` (replace the empty file)

**Step 1: Write `client/src/styles.css`**

```css
/* Colours and shapes taken from the reference mock (ux_designs/9.jpg). */
:root {
  --page: #2b2fa8;
  --page-deep: #1f2290;
  --page-glow: #3a40c9;
  --royal: #2f54d6;
  --royal-light: #3b64e8;
  --royal-deep: #2848c6;
  --navy: #2a3a9e;
  --navy-hover: #30429f;
  --cyan: #1eb4f5;
  --cyan-press: #0f9fdf;
  --orange: #f7a21b;
  --yellow: #f9c846;
  --pink: #f0628f;
  --ink: #2b2fa8;
  --ink-body: #2d3170;
  --ink-soft: #5b5f9e;
  --muted: #9aa0c7;
  --line: #e6e9fb;
  --paper: #ffffff;
  --paper-soft: #f4f6ff;
  --on-blue: #ffffff;
  --on-blue-muted: rgba(255, 255, 255, 0.62);
  --get: #1e88e5;
  --post: #1f9d5f;
  --patch: #e08a00;
  --delete: #e5484d;
  --mono: ui-monospace, 'Cascadia Code', Consolas, 'SF Mono', monospace;
  font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif;
  color-scheme: light;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 15% 0%, var(--page-glow) 0%, transparent 55%),
    radial-gradient(ellipse at 100% 100%, var(--page-deep) 0%, transparent 60%),
    var(--page);
  background-attachment: fixed;
  color: var(--on-blue);
  font-size: 17px;
  line-height: 1.5;
}

button {
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

:focus-visible {
  outline: 3px solid var(--yellow);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---------- Page layout ---------- */

.layout {
  display: grid;
  grid-template-columns: minmax(0, 440px) minmax(0, 600px);
  gap: 48px;
  justify-content: center;
  align-items: start;
  padding: 56px 24px;
}

@media (max-width: 1000px) {
  .layout {
    grid-template-columns: minmax(0, 600px);
    gap: 24px;
    padding: 24px 16px;
  }
}

/* ---------- Blue app column: the mock's list screen ---------- */

.phone {
  position: relative;
  overflow: hidden;
  padding: 40px 32px 32px;
  border-radius: 28px;
  background: linear-gradient(165deg, var(--royal-light) 0%, var(--royal) 55%, var(--royal-deep) 100%);
  box-shadow: 0 32px 64px rgba(12, 14, 90, 0.45);
}

.phone::before {
  content: '';
  position: absolute;
  top: -140px;
  right: -220px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.phone > * {
  position: relative;
}

@media (max-width: 480px) {
  .phone {
    padding: 32px 20px 24px;
  }
}

.phone-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
}

.date {
  margin: 0;
  font-size: 36px;
  font-weight: 500;
  line-height: 1.2;
}

.date span {
  display: block;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--yellow);
  color: var(--ink);
  font-weight: 600;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--on-blue);
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.22);
}

.icon-button svg {
  width: 20px;
  height: 20px;
}

.signed-in-as {
  margin: 0 0 28px;
  color: var(--on-blue-muted);
  font-size: 14px;
  overflow-wrap: anywhere;
}

/* Todo cards */

.todo-list {
  display: grid;
  gap: 18px;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
}

.todo-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 80px;
  margin-left: 22px;
  padding: 14px 18px 14px 58px;
  border-radius: 10px;
  background: var(--navy);
  transition: background 0.15s;
}

.todo-card:hover {
  background: var(--navy-hover);
}

.todo-icon {
  position: absolute;
  top: 50%;
  left: -24px;
  width: 64px;
  height: 64px;
  transform: translateY(-50%);
  filter: drop-shadow(0 6px 8px rgba(10, 12, 70, 0.35));
}

.todo-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  padding: 4px 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.todo-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.todo-note {
  color: var(--on-blue-muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.delete-button {
  display: grid;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--on-blue);
  opacity: 0.35;
  transition: opacity 0.15s, background 0.15s;
}

.todo-card:hover .delete-button,
.delete-button:focus-visible {
  opacity: 1;
}

.delete-button:hover {
  background: rgba(229, 72, 77, 0.3);
}

.delete-button svg {
  width: 18px;
  height: 18px;
}

.check {
  display: grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  background: transparent;
  color: var(--royal);
}

.check.checked {
  border-color: var(--paper);
  background: var(--paper);
}

.check svg {
  width: 16px;
  height: 16px;
}

.empty {
  margin: 0 0 28px;
  padding: 24px;
  border: 2px dashed rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  color: var(--on-blue-muted);
  text-align: center;
}

/* Buttons */

.primary,
.secondary {
  display: block;
  width: 100%;
  padding: 18px;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: background 0.15s, transform 0.1s;
}

.primary {
  border: 0;
  background: var(--cyan);
  color: #fff;
  box-shadow: 0 12px 24px rgba(30, 180, 245, 0.35);
}

.primary:hover:not(:disabled) {
  background: var(--cyan-press);
}

.secondary {
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: transparent;
  color: var(--on-blue);
}

.secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.primary:active:not(:disabled),
.secondary:active:not(:disabled) {
  transform: translateY(1px);
}

.primary:disabled,
.secondary:disabled {
  opacity: 0.5;
  box-shadow: none;
}

.demo-button {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border: 2px dashed rgba(249, 200, 70, 0.75);
  border-radius: 8px;
  background: transparent;
  color: var(--yellow);
  font-size: 15px;
  font-weight: 500;
}

.demo-button:hover {
  background: rgba(249, 200, 70, 0.12);
}

.banner {
  margin: 0 0 20px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 15px;
}

.banner.error {
  border: 1px solid rgba(255, 138, 138, 0.7);
  background: rgba(229, 72, 77, 0.22);
}

.banner.info {
  border: 1px solid rgba(249, 200, 70, 0.7);
  background: rgba(249, 200, 70, 0.18);
}

/* Login */

.login-art {
  display: block;
  width: 120px;
  height: 120px;
  margin: 0 auto 8px;
}

.login h1 {
  margin: 0 0 24px;
  font-size: 36px;
  font-weight: 600;
  text-align: center;
}

.eyebrow.on-blue {
  color: var(--yellow);
  text-align: center;
}

.field {
  display: block;
  margin-bottom: 16px;
}

.field span {
  display: block;
  margin-bottom: 6px;
  color: var(--on-blue-muted);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--navy);
  color: var(--on-blue);
  font: inherit;
}

.field input:focus {
  border-color: var(--cyan);
  outline: none;
}

.login-actions {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.demo-hint {
  margin: 20px 0 0;
  color: var(--on-blue-muted);
  font-size: 13px;
  text-align: center;
  overflow-wrap: anywhere;
}

.demo-hint code {
  color: var(--yellow);
  font-family: var(--mono);
}

/* ---------- Teaching panel: the mock's white detail card ---------- */

.learn-panel {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  background: var(--paper);
  color: var(--ink-soft);
  box-shadow: 0 32px 64px rgba(12, 14, 90, 0.45);
}

/* The indigo swoosh in the bottom-right corner of the mock's card. */
.learn-panel::after {
  content: '';
  position: absolute;
  right: -50px;
  bottom: -40px;
  width: 200px;
  height: 80px;
  border-radius: 50%;
  background: var(--ink);
  transform: rotate(-14deg);
  pointer-events: none;
}

.panel-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--paper-soft);
}

.panel-heading {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tab {
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 500;
}

.tab:hover:not([aria-selected='true']) {
  background: var(--line);
}

.tab[aria-selected='true'] {
  background: var(--ink);
  color: #fff;
}

.panel-body {
  position: relative;
  z-index: 1;
  padding: 28px 28px 72px;
}

@media (max-width: 480px) {
  .panel-top,
  .panel-body {
    padding-right: 20px;
    padding-left: 20px;
  }
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.entry-title {
  margin: 0 0 16px;
  color: var(--ink);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.method {
  flex: none;
  padding: 3px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.method-get { background: var(--get); }
.method-post { background: var(--post); }
.method-patch { background: var(--patch); }
.method-delete { background: var(--delete); }
.method-other { background: var(--ink-soft); }

.route {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--paper-soft);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.status {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.status-ok { background: rgba(31, 157, 95, 0.14); color: #11663d; }
.status-warn { background: rgba(247, 162, 27, 0.2); color: #8a5200; }
.status-bad { background: rgba(229, 72, 77, 0.14); color: #a3161b; }

.duration {
  color: var(--muted);
  font-size: 13px;
}

.summary {
  margin: 0 0 14px;
  color: var(--ink-body);
  font-size: 18px;
}

.analogy {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff7e6;
  color: #6b4a00;
}

.analogy-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--yellow);
  font-size: 16px;
}

/* Alternating yellow and orange chips, like the mock's day picker. */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.tags li {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--orange);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.tags li:nth-child(odd) {
  background: var(--yellow);
  color: #5c3d00;
}

.points {
  margin: 0 0 16px;
  padding-left: 20px;
  color: var(--ink-body);
}

.points li {
  margin-bottom: 6px;
}

.footnote {
  margin: 0 0 16px;
  color: var(--ink-soft);
  font-size: 14px;
  font-style: italic;
}

.code-pointer {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 14px;
}

.code-pointer span {
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.code-pointer code {
  padding: 3px 8px;
  border-radius: 6px;
  background: #eef1ff;
  color: var(--ink);
  font-family: var(--mono);
  overflow-wrap: anywhere;
}

.raw {
  border: 1px solid var(--line);
  border-radius: 12px;
}

.raw summary {
  padding: 12px 16px;
  color: var(--ink);
  font-weight: 500;
  cursor: pointer;
}

.raw-body {
  padding: 0 16px 16px;
}

.raw h4 {
  margin: 12px 0 6px;
  color: var(--ink);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.raw pre,
.state-value {
  max-height: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  background: #1d2060;
  color: #e8eaff;
  font: 13px/1.5 var(--mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.header-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font: 13px/1.6 var(--mono);
  color: var(--ink-body);
}

.header-list li {
  padding: 2px 0;
  overflow-wrap: anywhere;
}

.header-list li.highlight {
  margin: 4px 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff3c4;
}

.header-list .key {
  color: var(--ink);
  font-weight: 600;
}

.header-note {
  display: block;
  color: #7a5000;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
}

/* History of earlier requests */

.history {
  margin-top: 24px;
}

.history h4 {
  margin: 0 0 8px;
  color: var(--ink);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history ol {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  color: var(--ink-soft);
  font-size: 14px;
  text-align: left;
}

.history button:hover {
  background: var(--paper-soft);
}

.history button[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--paper-soft);
}

.route-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Welcome and concepts */

.welcome-art {
  width: 96px;
  height: 96px;
  margin-bottom: 8px;
}

.welcome p:last-child {
  color: var(--ink-body);
}

.concept-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 24px;
}

.concept-chip {
  padding: 6px 12px;
  border: 1px solid #d9ddf7;
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink);
  font-size: 14px;
}

.concept-chip:hover {
  background: var(--paper-soft);
}

.concept-chip[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--ink);
  color: #fff;
}

/* Token */

.jwt {
  margin: 0 0 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--paper-soft);
  font: 14px/1.6 var(--mono);
  overflow-wrap: anywhere;
}

.jwt-header { color: #c2185b; }
.jwt-payload { color: #6a1b9a; }
.jwt-signature { color: #00796b; }
.jwt-header-bg { background: #c2185b; }
.jwt-payload-bg { background: #6a1b9a; }
.jwt-signature-bg { background: #00796b; }

.jwt-legend {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  color: var(--ink-body);
  font-size: 14px;
}

.jwt-legend li {
  margin-bottom: 4px;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 50%;
}

.claims {
  width: 100%;
  margin: 0 0 16px;
  border-collapse: collapse;
  color: var(--ink-body);
  font-size: 14px;
}

.claims th,
.claims td {
  padding: 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

.claims th {
  color: var(--ink);
  font-family: var(--mono);
  white-space: nowrap;
}

.claims td.value {
  font-family: var(--mono);
  overflow-wrap: anywhere;
}

.callout {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-left: 4px solid var(--pink);
  border-radius: 0 10px 10px 0;
  background: #fff0f5;
  color: #7a1f45;
}

/* State */

.state-row {
  margin-bottom: 18px;
}

.state-row header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.state-label {
  color: var(--ink);
  font-family: var(--mono);
  font-weight: 600;
}

.state-kind {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.state-kind.server { background: #e3f2fd; color: #0d47a1; }
.state-kind.client { background: #fff3e0; color: #8a4500; }

.state-note {
  margin: 0 0 6px;
  color: var(--ink-body);
  font-size: 14px;
}

.flash {
  animation: flash 1.2s ease-out;
}

@keyframes flash {
  from {
    background: #4a4fc4;
    box-shadow: 0 0 0 3px var(--yellow);
  }
  to {
    background: #1d2060;
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flash {
    animation: none;
  }
}

/* ---------- Task modal: the mock's detail screen ---------- */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(16, 18, 80, 0.6);
  backdrop-filter: blur(3px);
}

.modal {
  width: min(420px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 24px 24px 28px;
  border-radius: 24px;
  background: var(--paper);
  color: var(--ink-soft);
  box-shadow: 0 32px 64px rgba(12, 14, 90, 0.5);
}

.modal-art {
  position: relative;
  display: grid;
  place-items: center;
  height: 170px;
}

.modal-icon {
  width: 150px;
  height: 150px;
}

.back-button {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--cyan);
  color: #fff;
  box-shadow: 0 6px 14px rgba(30, 180, 245, 0.4);
}

.back-button svg {
  width: 20px;
  height: 20px;
}

.modal-card {
  position: relative;
  overflow: hidden;
  margin: 0 0 24px;
  padding: 22px 22px 44px;
  border-radius: 14px;
  background: var(--paper);
  box-shadow: 0 16px 40px rgba(43, 47, 168, 0.18);
}

.modal-card::after {
  content: '';
  position: absolute;
  right: -40px;
  bottom: -50px;
  width: 180px;
  height: 90px;
  border-radius: 50%;
  background: var(--ink);
  transform: rotate(-12deg);
  pointer-events: none;
}

.title-input {
  width: 100%;
  margin: 0 0 18px;
  padding: 4px 0;
  border: 0;
  border-bottom: 2px solid var(--line);
  background: transparent;
  color: var(--ink);
  font: 700 30px/1.2 'Poppins', sans-serif;
  text-transform: uppercase;
}

.title-input::placeholder {
  color: #c5c9ee;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  color: var(--orange);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.note-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--line);
  border-radius: 8px;
  color: var(--ink-body);
  font: inherit;
}

.title-input:focus,
.note-input:focus {
  border-color: var(--cyan);
  outline: none;
}

.hint {
  position: relative;
  z-index: 1;
  margin: 12px 0 0;
  color: #a3161b;
  font-size: 13px;
}

.hint.subtle {
  max-width: 75%;
  color: var(--muted);
}
```

**Step 2: Look at it in a browser**

Run `npm run dev` in the background.
Open `http://localhost:5173`, log in as `alice@demo.test` / `demo-password-123`, and compare with `c:/Users/Rahul/Pictures/ux_designs/9.jpg`.
Check at 1440x900 and at 390x844 (phone width).
Fix anything that looks off before committing.

**Step 3: Commit**

```bash
git add client/src/styles.css
git commit -m "feat(client): style the app after the reference mock"
```

---

### Task 15: End-to-end test of the whole student journey

**Files:**
- Create: `playwright.config.js`, `e2e/student-journey.spec.js`

**Step 1: `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm start -w server',
      // Answers 401 without a token, which Playwright counts as "ready".
      url: 'http://localhost:3001/api/todos',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -w client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
```

**Step 2: `e2e/student-journey.spec.js`**

```js
import { expect, test } from '@playwright/test';

test('a student signs up, uses every HTTP method, gets blocked, and logs out', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    // The browser always logs failed requests; the 404 from the authorization demo is expected.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      consoleErrors.push(message.text());
    }
  });

  // A fresh account each run, so the list always starts empty.
  const email = `e2e-${Date.now()}@demo.test`;
  const panel = page.getByRole('complementary', { name: 'What just happened?' });

  // Sign up (authentication).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'WELCOME' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  // GET runs as soon as the todo screen appears.
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'GET · READ' })).toBeVisible();
  await expect(page.getByText('No tasks yet')).toBeVisible();

  // POST
  await page.getByRole('button', { name: 'Add new task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByLabel('Task name').fill('Reading books');
  await dialog.getByLabel('Note').fill('Read every day');
  await dialog.getByRole('button', { name: 'Finish' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Edit Reading books' })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'POST · CREATE' })).toBeVisible();
  await expect(panel.getByText('201 Created').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/after-create.png', fullPage: true });

  // PATCH (toggle)
  const checkbox = page.getByRole('checkbox', { name: 'Mark Reading books as done' });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  await expect(panel.getByRole('heading', { name: 'PATCH · UPDATE' })).toBeVisible();

  // PATCH (edit)
  await page.getByRole('button', { name: 'Edit Reading books' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit task' });
  await editDialog.getByLabel('Task name').fill('Reading novels');
  await editDialog.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('button', { name: 'Edit Reading novels' })).toBeVisible();

  // Authorization demo
  await page.getByRole('button', { name: "Try to edit someone else's todo" }).click();
  await expect(panel.getByRole('heading', { name: 'AUTHORIZATION · BLOCKED' })).toBeVisible();
  await expect(panel.getByText('404 Not Found').first()).toBeVisible();
  await expect(page.getByText('Blocked!')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/authorization.png', fullPage: true });

  // State tab
  await panel.getByRole('tab', { name: 'State' }).click();
  await expect(panel.getByRole('heading', { name: 'STATE' })).toBeVisible();
  await expect(panel.getByText('"Reading novels"')).toBeVisible();

  // Token tab
  await panel.getByRole('tab', { name: 'Token' }).click();
  await expect(panel.getByRole('cell', { name: email })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/token.png', fullPage: true });

  // DELETE
  await panel.getByRole('tab', { name: 'Live' }).click();
  await page.getByRole('button', { name: 'Delete Reading novels' }).click();
  await expect(panel.getByRole('heading', { name: 'DELETE · REMOVE' })).toBeVisible();
  await expect(panel.getByText('204 No Content').first()).toBeVisible();
  await expect(page.getByText('No tasks yet')).toBeVisible();

  // Log out
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('the demo account sees seeded todos, and the layout works at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Email').fill('alice@demo.test');
  await page.getByLabel('Password').fill('demo-password-123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('button', { name: 'Edit Reading books' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Climb mountains' })).toBeVisible();

  // Nothing should scroll sideways on a phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/screens/phone.png', fullPage: true });
});
```

**Step 3: Run it**

Run: `npm run seed && npm run test:e2e`
Expected: 2 passed.
If a selector fails, look at the trace (`npx playwright show-trace test-results/.../trace.zip`), fix the app or the selector, and re-run.
Run it 3 times in a row to check for flakiness.

**Step 4: Commit**

```bash
git add playwright.config.js e2e
git commit -m "test(e2e): cover the full student journey and phone layout"
```

---

### Task 16: README with setup and a classroom script, then final verification

**Files:**
- Create: `README.md`

**Step 1: Write `README.md`**

````markdown
# System Design Tutor

A todo app that explains how full stack apps work, for students who have never seen HTTP, auth or state before.
Every time the app talks to a server, the "What just happened?" panel explains it in plain English.

## Setup

1. Install Node 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your Supabase URL and publishable key.
4. In the Supabase dashboard, open Authentication → Sign In / Providers → Email and turn off **Confirm email**.
   Demo accounts use fake addresses that cannot receive email.
5. Apply `supabase/migrations/20260929000000_create_todos.sql` to your project (SQL editor or `supabase db push`).
6. Run `npm run seed` to create the demo accounts.

## Run

```bash
npm run dev
```

Open http://localhost:5173.
Demo accounts: `alice@demo.test` and `bob@demo.test`, password `demo-password-123`.
Run `npm run seed` before each class to reset them.

## How it fits together

```
Browser (React, client/)  ──HTTP + token──▶  Express API (server/)  ──SQL──▶  Supabase Postgres
        │
        └──── log in / sign up ────────────▶  Supabase Auth (hands out the token)
```

## Suggested lesson

1. **Log in as Alice.** Authentication: the panel shows the password being sent and a token coming back.
2. **Watch the list load.** GET: reading data changes nothing.
3. **Add a task.** POST: new data in the body, 201 Created back.
4. **Tick it, then rename it.** PATCH: only the changed fields are sent.
5. **Delete it.** DELETE: 204 No Content.
6. **Open the Token tab.** What "being logged in" really is, and why anyone can read a token but nobody can fake one.
7. **Press "Try to edit someone else's todo".** Authorization: logged in is not the same as allowed.
8. **Open the State tab and add a task.** Server state versus client state.
9. **Open "See the full request and response".** Headers, bodies and the Authorization header.
10. **Use "Where in code" to jump to the file that handled each request.**

## Tests

```bash
npm test          # server and client unit and integration tests
npm run test:e2e  # full browser test (starts both servers)
npm run lint
```
````

**Step 2: Full verification**

Run each and confirm the output:
```bash
npm run lint
npm test
npm run build -w client
npm run seed
npm run test:e2e
```
Expected: lint clean, all tests pass, build succeeds, e2e 2 passed.

**Step 3: Final visual check against the mock**

Start `npm run dev`, then open the app in a real browser (use the claude-in-chrome skill, or Read the Playwright screenshots in `test-results/screens/`).
Compare against `c:/Users/Rahul/Pictures/ux_designs/9.jpg`.
Check: indigo page, blue list card with overlapping illustrations, circle checkboxes, cyan uppercase buttons, white panel with bold indigo title and orange/yellow chips, and a modal that looks like the mock's middle screen.
Also check the login page, every panel tab, a long todo title, an empty list and phone width.
Fix anything that looks off, re-run Step 2, and commit.

Run `get_advisors` (security) one more time and report anything it finds.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup guide and classroom lesson script"
```
