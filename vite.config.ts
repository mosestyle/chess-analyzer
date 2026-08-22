import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths make the same build work for GitHub project Pages and custom domains.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
