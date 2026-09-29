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
