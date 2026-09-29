import { createServerClient } from '../src/supabase.js';

// Logs in as a user, creating the account first if it does not exist yet.
// Returns a Supabase client that acts as that user, plus the session (which holds the token).
export async function signInOrSignUp(email, password) {
  const client = createServerClient();
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
