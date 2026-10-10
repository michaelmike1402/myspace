import { defineConfig, devices } from "@playwright/test";
const baseURL = `http://127.0.0.1:5187${process.env.MYSPACE_TEST_BASE || "/"}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        timezoneId: "America/New_York",
      },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 13"], timezoneId: "Asia/Shanghai" },
    },
  ],
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5187 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
