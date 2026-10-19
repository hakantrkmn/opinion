import base from "./playwright.config";
export default {
  ...base,
  timeout: 240_000,
  expect: { timeout: 60_000 },
  use: { ...base.use, actionTimeout: 60_000, navigationTimeout: 90_000 },
};
