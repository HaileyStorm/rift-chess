import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: { index: 'index.html', api: 'src/api.ts' },
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: chunk => chunk.name === 'api' ? 'api.js' : 'assets/[name]-[hash].js' },
    },
  },
  server: { port: 5173, strictPort: true },
  // Vitest remains a dormant dependency in the immutable semantic-v2 package inputs.
  // Unit/integration discovery is retired; acceptance uses actual E2E and proofs.
  test: { include: [] },
});
