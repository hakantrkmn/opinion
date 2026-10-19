import type { Page } from "@playwright/test";
import { signUpUser } from "./support/api";
import { uniqueSuffix, uniqueTestIp } from "./support/env";
import { expect, test } from "./support/fixtures";

/*
 * Auth screens are being polished concurrently: role/label selectors only.
 * OTP flows (email verification, password reset) are not covered: the codes
 * only reach the dev server's stdout.
 */

/** Gives this page's better-auth calls their own rate-limit bucket (see uniqueTestIp). */
async function isolateAuthRateLimit(page: Page) {
  const ip = uniqueTestIp();
  await page.route("**/api/auth/**", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } })
  );
}

function authForm(page: Page) {
  return {
    displayName: page.getByLabel("Display name"),
    email: page.getByLabel("Email"),
    password: page.getByLabel("Password", { exact: true }),
    signIn: page.getByRole("button", { name: "Sign in", exact: true }),
    createAccount: page.getByRole("button", { name: "Create account" }),
  };
}

/** Password hashing makes auth requests slow on `next dev`; allow for it. */
const AUTH_TIMEOUT = { timeout: 30_000 };

async function expectSignedIn(page: Page, name: string) {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: new RegExp(name) })).toBeVisible(AUTH_TIMEOUT);
  await expect(header.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
}

test.describe("auth UI", () => {
  test.beforeEach(async ({ page }) => {
    await isolateAuthRateLimit(page);
  });

  test("sign up → signed in → sign out → sign in", async ({ page }) => {
    const suffix = uniqueSuffix();
    const name = `E2E Signup ${suffix.slice(-5)}`;
    const email = `e2e-ui-${suffix}@example.test`;
    const password = `pw-${suffix}-UI`;
    const form = authForm(page);

    await page.goto("/auth");
    await page.getByRole("tab", { name: "Sign up" }).click();
    await form.displayName.fill(name);
    await form.email.fill(email);
    await form.password.fill(password);
    await form.createAccount.click();

    await expect(page).toHaveURL((url) => url.pathname === "/", AUTH_TIMEOUT);
    await expectSignedIn(page, name);

    await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in", exact: true })).toBeVisible(
      AUTH_TIMEOUT
    );

    await page.goto("/auth");
    await form.email.fill(email);
    await form.password.fill(password);
    await form.signIn.click();
    await expect(page).toHaveURL((url) => url.pathname === "/", AUTH_TIMEOUT);
    await expectSignedIn(page, name);
  });

  test("wrong password shows an error and stays on /auth", async ({ page }) => {
    const user = await signUpUser();
    await user.api.dispose();
    const form = authForm(page);

    await page.goto("/auth");
    await form.email.fill(user.email);
    await form.password.fill(`${user.password}-wrong`);
    await form.signIn.click();

    await expect(page.getByRole("alert").filter({ hasText: /invalid|incorrect|wrong/i })).toBeVisible(
      AUTH_TIMEOUT
    );
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("client-side validation blocks an empty submit", async ({ page }) => {
    const form = authForm(page);
    await page.goto("/auth");
    await form.signIn.click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(form.email).toHaveAttribute("aria-invalid", "true");
  });

  test("/profile while signed out → /auth?redirect=/profile → back after sign-in", async ({ page }) => {
    const user = await signUpUser();
    await user.api.dispose();
    const form = authForm(page);

    await page.goto("/profile");
    await expect(page).toHaveURL((url) => url.pathname === "/auth" && url.searchParams.get("redirect") === "/profile");

    await form.email.fill(user.email);
    await form.password.fill(user.password);
    await form.signIn.click();

    await expect(page).toHaveURL((url) => url.pathname === "/profile", AUTH_TIMEOUT);
    await expect(page.getByRole("heading", { level: 1, name: user.name })).toBeVisible();
  });
});
