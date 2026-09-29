import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

// Every Supabase client on the server is built here, so they all share the same settings.
// - No saved session: the server serves many users, so it must never remember a login.
// - `ws`: supabase-js builds a realtime client, and Node 20 has no built-in WebSocket for it.
//   This app does not use realtime, but the client still needs the transport to start.
export function createServerClient(extra = {}) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
    ...extra,
  });
}

// Used only to check tokens with Supabase Auth.
export const authClient = createServerClient();

// A Supabase client that acts *as the logged-in user*.
// Because it forwards the user's token, the database's Row Level Security rules
// apply to every query: a second lock behind the server's own checks.
export function supabaseAsUser(accessToken) {
  return createServerClient({ global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}
