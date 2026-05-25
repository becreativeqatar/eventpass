import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**',
        'src/app/api/**',
        'src/components/**',
        'src/contexts/**',
        'src/hooks/**',
        'src/middleware.ts',
      ],
      exclude: ['src/components/ui/**', 'src/test/**', '**/*.test.*'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
    environmentMatchGlobs: [
      ['src/components/**/*.test.tsx', 'jsdom'],
      ['src/contexts/**/*.test.tsx', 'jsdom'],
      ['src/hooks/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    environment: 'node',
  },
});
