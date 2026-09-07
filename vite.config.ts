import { defineConfig } from 'vite';
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
});
