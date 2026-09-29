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
