import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5191);
export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: `npx vite --port ${port} --strictPort`, port, reuseExistingServer: true },
});
