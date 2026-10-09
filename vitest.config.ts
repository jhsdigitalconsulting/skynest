import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // React 17+ runtime, as Next uses, so .tsx under test needs no `import React`.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
  },
});
