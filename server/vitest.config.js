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
