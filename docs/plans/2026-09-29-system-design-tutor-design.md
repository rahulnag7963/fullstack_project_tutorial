# System Design Tutor: Design

A todo app with a login page, built to teach absolute beginners the core ideas behind a full stack application.
It covers the HTTP methods GET, POST, PATCH and DELETE, plus authentication, authorization, security and state.
It is used by an instructor as a live classroom demo.

## Goals

- Every concept is shown at the moment it happens, next to a plain-English definition and an everyday analogy.
- The panel shows real traffic, never scripted text.
- The code itself reads like the concepts, so the instructor can jump from the UI to the file that did the work.
- The UI follows the reference mock at `c:/Users/Rahul/Pictures/ux_designs/9.jpg`, adapted for a wide screen.

## Non-goals

- Calendar view, due dates, repeat schedules.
- Deployment. The app runs locally on the instructor's machine.
- Multi-language support.

## Architecture

```
Browser (React)  ──HTTP + JWT──▶  Express API  ──SQL──▶  Supabase Postgres
      │                               │
      └──── login/signup ────────▶ Supabase Auth (issues JWT)
```

One repository with two folders.
`client/` is a React app built with Vite.
`server/` is a Node Express API.
A single `npm run dev` at the root starts both.
All code is plain JavaScript, chosen for readability by beginners.

Supabase provides Auth and Postgres.
The client uses the Supabase JS client only to sign up, log in and log out.
Every todo operation goes through Express, never directly to Supabase.

### Database

One table, `public.todos`:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `user_id` | `uuid` | References `auth.users(id)`, cascade on delete |
| `title` | `text` | Required, 1 to 200 characters |
| `note` | `text` | Optional subtitle, up to 200 characters |
| `done` | `boolean` | Defaults to `false` |
| `created_at` | `timestamptz` | Defaults to `now()` |

Row Level Security is enabled with owner-only policies for select, insert, update and delete.
Each policy carries a plain-English comment.
The server also filters every query by the authenticated `user_id`.
Two independent checks illustrate "defense in depth".

### API

| Action | Method and route | Success |
|---|---|---|
| Load list | `GET /api/todos` | 200 with an array |
| Add | `POST /api/todos` | 201 with the created todo |
| Toggle, rename or re-note | `PATCH /api/todos/:id` | 200 with the updated todo |
| Delete | `DELETE /api/todos/:id` | 204, no body |

A `requireAuth` middleware reads the `Authorization: Bearer <jwt>` header, verifies it with Supabase, and attaches the user to the request.
The server queries Postgres on behalf of that user, so RLS applies as the second check.
Routes live in `server/routes/todos.js`, and each handler has a short comment naming the concept it demonstrates.

### Request logging for the panel

A small `client/src/api.js` wrapper around `fetch` records every request and response.
Each record includes the method, URL, headers, body, status, response and duration.
Supabase Auth calls are logged the same way.
The panel renders these records, so it always reflects what really happened.

## UI

### Visual language, from the mock

- Page background: deep indigo, around `#2B2FA8`, with a soft radial glow.
- App column: royal blue, around `#2F54D6`.
- Todo cards: navy tiles, around `#2A3A9E`, rounded, uppercase bold title, muted subtitle line.
- Primary buttons: cyan, around `#1EB4F5`, full width, uppercase labels.
- Highlights and status chips: orange `#F7A21B` and yellow `#F9C846`.
- Checkboxes: outlined circles that fill with a white check.
- Illustrations: about 8 colourful flat inline-SVG icons that overlap each card's left edge.
  The icon is chosen from keywords in the title, falling back to a hash of the id.
- Type: Poppins from Google Fonts.
  The large date heading in the top left mirrors the mock.

### Layout

```
┌───────────── indigo page background ──────────────────────────────┐
│ ┌── blue app column ────────────────┐  ┌── What just happened? ──┐│
│ │ 2026                         👤 ⎋ │  │  white detail card:     ││
│ │ September 29th                    │  │  big indigo headline,   ││
│ │ [📚] READING BOOKS           ✔    │  │  status and route chips,││
│ │      Read every day               │  │  analogy, request and   ││
│ │ [🎨] PAINTING                ○    │  │  response, code pointer ││
│ │ [ ADD NEW TASK ]                  │  │                         ││
│ └───────────────────────────────────┘  └─────────────────────────┘│
│   [Peek at token] [State inspector] [Try someone else's todo]      │
└────────────────────────────────────────────────────────────────────┘
```

- Left: the list screen as a centred card about 420px wide.
- Right: the teaching panel, styled like the mock's white detail card.
- Header: the logged-in user, a log-out button and a Concepts menu that opens any definition on demand.
- Add and edit use a modal styled like the mock's middle screen: illustration on top, white card, title and note inputs, cyan FINISH button.
  Saving a new task sends POST, and saving an edit sends PATCH.
- Login page: the same blue card and illustration style, with the teaching panel explaining authentication beside it.
- On narrow screens the columns stack.
- Type sizes are chosen for a projector.

### Panel entry for a request

1. Method badge coloured by method (GET blue, POST green, PATCH amber, DELETE red), the route and the status code.
2. One or two plain-English sentences and an analogy.
3. Expandable request and response details.
   The `Authorization` header is highlighted with the note "this is your wristband".
4. A "where this happened in code" line, for example `server/routes/todos.js → router.post('/')`.

### Definitions

- **GET**: asking the server to show you something. Like reading a menu, nothing changes.
- **POST**: sending something new to be saved. Like mailing a letter.
- **PATCH**: changing part of something that already exists. Like fixing a typo with correction tape.
  A footnote explains that PUT replaces the whole thing, while PATCH changes only part.
- **DELETE**: asking the server to remove something. Like shredding a document.
- **Authentication**: proving who you are. Like showing ID at a club door and getting a wristband, which is the JWT.
- **Authorization**: what you are allowed to do once you are in. The wristband gets you in, but not behind the bar.
- **Security**: passwords are hashed, tokens expire, the server re-checks ownership of every todo because it never trusts the browser, and RLS is a second lock.
- **State**: what the app is remembering right now.
  Server state is the app's copy of data that lives on the server.
  Client state lives only in the browser, like text typed before pressing Add.
- **Status codes**: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Who are you?, 404 Not Found, 500 Server Error.

### Demos

- **Peek at token**: decodes the current JWT and shows the user id, email and expiry, with notes on each field.
- **State inspector**: a live view of `user`, `todos` and `lastRequest`.
  It flashes on change and labels each value as server state or client state.
- **Try someone else's todo**: sends PATCH to a todo id owned by the other seeded user.
  The server answers 404, and the panel explains authorization.

### Seed data

A seed script creates `alice@demo.test` and `bob@demo.test`, each with a few todos.
The "someone else's todo" demo targets one of the other user's todo ids.

## Error handling

The server has one central error handler.
Every error response has the shape `{ error: { code, message } }`.
Stack traces never reach the browser.

| Situation | Status | Panel message |
|---|---|---|
| Missing or expired token | 401 | The server doesn't know who you are. The app returns to the login page. |
| Someone else's todo | 404 | The todo isn't yours. "Not found" avoids revealing that it exists. |
| Empty or over-long title or note | 400 | The server validates input because it never trusts the browser. |
| Wrong password | 400 from Supabase | A friendly message, plus why login errors are deliberately vague. |
| Server or database failure | 500 or network error | Something broke on the server side. |

Input is validated on the client for a nicer experience and on the server for safety.
The panel points out the difference.

## Security and configuration

- `.env` holds `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which the client may use, and any server-only secrets.
- `.env` is git-ignored, and a committed `.env.example` documents each variable.
- The service role key, if needed for seeding, is only ever read by server-side scripts and never bundled into the client.

## Testing

- **Server**: Vitest and Supertest for each route.
  Cases cover the happy paths, 401 without a token, 404 on another user's todo, and 400 on bad input.
  Tests run against the real Supabase project with a dedicated test user, so demo data is untouched.
- **Client**: Vitest and React Testing Library for the request logger and panel rendering.
- **End to end**: one Playwright script covering sign up, log in, add, toggle, edit, delete, the someone-else's-todo demo and log out.
  It captures screenshots for comparison with the mock.
- **Visual check**: the running app is compared against the mock in a real browser before the work is called done.
