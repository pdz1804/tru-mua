import { defineConfig } from 'vitest/config';

// Unit tests live next to source; Playwright specs in e2e/ run separately.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
