import { randomUUID } from 'node:crypto';
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
    title: todo.title,
    note: todo.note ?? '',
    done: todo.done ?? false,
    user_id: userId,
    created_at: new Date(start + index * 1000).toISOString(),
    // Every column is filled in explicitly: a bulk insert that leaves some rows without a value sends null for them.
    id: index === 0 ? user.pinnedTodoId : randomUUID(),
  }));

  const { error: insertError } = await client.from('todos').insert(rows);
  if (insertError) throw insertError;

  await client.auth.signOut();
  console.log(`Seeded ${user.email} with ${rows.length} todos.`);
}
