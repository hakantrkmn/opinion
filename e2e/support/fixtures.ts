import {
  test as base,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type Response,
} from "@playwright/test";
import { newApi, signUpUser, type TestUser } from "./api";

export interface ErrorLog {
  /** Uncaught exceptions + console.error messages seen so far. */
  readonly messages: string[];
}

interface Fixtures {
  /** A brand-new account (signed up via the API), not yet signed in the page. */
  freshUser: TestUser;
  /** Anonymous API client with the app's Origin. */
  anonApi: APIRequestContext;
  /** Collects page errors for the default `page`. */
  errors: ErrorLog;
  /** Skip the first-visit welcome card (on by default). */
  dismissIntro: boolean;
}

export const test = base.extend<Fixtures>({
  dismissIntro: [true, { option: true }],

  context: async ({ context, dismissIntro }, provide) => {
    if (dismissIntro) {
      await context.addInitScript(() => {
        try {
          localStorage.setItem("dropinion:intro-dismissed", "1");
        } catch {
          /* storage blocked */
        }
      });
    }
    await provide(context);
  },

  freshUser: async ({}, provide) => {
    const user = await signUpUser();
    await provide(user);
    await user.api.dispose();
  },

  anonApi: async ({}, provide) => {
    const api = await newApi();
    await provide(api);
    await api.dispose();
  },

  errors: async ({ page }, provide) => {
    const messages: string[] = [];
    page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") messages.push(`console.error: ${msg.text()}`);
    });
    await provide({ messages });
  },
});

export { expect };

/** Puts `user`'s session cookies into the browser context. */
export async function signInContext(context: BrowserContext, user: Pick<TestUser, "storageState">) {
  await context.addCookies(user.storageState.cookies);
}

/** Matches a map data request; `path` is /api/pins or /api/pins/clusters. */
export function isMapRequest(path: "/api/pins" | "/api/pins/clusters", scope?: "all" | "following") {
  return (response: Response) => {
    const url = new URL(response.url());
    if (url.pathname !== path || response.request().method() !== "GET") return false;
    return scope ? url.searchParams.get("scope") === scope : true;
  };
}

/** The MapLibre canvas (pins are GL layers, not DOM). */
export function mapCanvas(page: Page) {
  return page.locator(".maplibregl-canvas");
}

/** Pin detail panel (a dialog titled with the pin name). */
export function pinPanel(page: Page, pinName: string | RegExp) {
  return page.getByRole("dialog", { name: pinName });
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
