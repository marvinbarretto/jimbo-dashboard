// Minimal vitest config for "npx vitest run" invocations of *.test.ts files.
//
// Why this exists: the Angular CLI builder (ng test / @angular/build:unit-test)
// processes *.spec.ts via a Vite plugin that resolves tsconfig path aliases
// (@domain/*, @shared/*, etc.) automatically. Direct "npx vitest run" doesn't
// use that plugin, so we provide the equivalent alias table here and a setup
// file that initialises the Angular TestBed.
//
// Scope: only *.test.ts files are included — *.spec.ts remain owned by ng test.

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '.');
const src  = resolve(root, 'src');

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig.json "paths" so module specifiers resolve at runtime.
      '@app':     resolve(src, 'app'),
      '@domain':  resolve(src, 'app/domain'),
      '@features': resolve(src, 'app/features'),
      '@shared':  resolve(src, 'app/shared'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    globals: true,
  },
});
