const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node tests/local-server.cjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
