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
  // The dev server: the walkthroughs drive the game through dev-only hooks (__tm, __store, __ch)
  // that the production bundle strips, so they stay off the live site.
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    port,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
