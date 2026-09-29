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
