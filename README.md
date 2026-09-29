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
