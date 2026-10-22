import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5191);
export default defineConfig({
  testDir: 'e2e',
  timeout: process.env.CI ? 900_000 : 480_000, // CI renders WebGL in software (SwiftShader)
  // one worker: parallel SwiftShader pages share the runner's 4 vCPUs and starve each other's frames
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // The walkthrough runs against the production bundle (`vite preview`), the thing that ships.
  // CI downloads the bundle the build job produced; locally a missing dist is built first.
  // E2E_DEV=1 uses the dev server instead.
  webServer: {
    command: process.env.E2E_DEV
      ? `npx vite --port ${port} --strictPort`
      : `${existsSync('dist/index.html') ? '' : 'npm run build && '}npx vite preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
