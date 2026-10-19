import { expect, request, type APIRequestContext, type APIResponse } from "@playwright/test";
import type {
  CommentItem,
  CreatePinResponse,
  PinCommentsResponse,
  PinsInBoundsResponse,
  PinSummary,
} from "../../src/types/api";
import { BASE_URL, ISTANBUL, ORIGIN, SEED_PASSWORD, uniqueSuffix, uniqueTestIp } from "./env";

type StorageState = Awaited<ReturnType<APIRequestContext["storageState"]>>;

/**
 * API client that behaves like the web app: same Origin (cookie-authenticated
 * mutations are rejected without it) and optional saved cookies.
 */
export function newApi(
  options: { storageState?: string | StorageState; headers?: Record<string, string> } = {}
): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    storageState: options.storageState,
    // `Connection: close`: no keep-alive. A client reusing a socket that
    // `next dev` is closing as idle (5 s keepAliveTimeout) gets ECONNRESET.
    extraHTTPHeaders: { Origin: ORIGIN, Connection: "close", ...options.headers },
    // Sign-up / sign-in hash passwords with scrypt on the server's main
    // thread (~1.5–3 s each on `next dev`); under parallel load they queue.
    timeout: 60_000,
  });
}

/** Asserts the status and returns the parsed JSON body (with a useful message). */
export async function expectJson<T>(response: APIResponse, status: number): Promise<T> {
  const text = await response.text();
  expect(response.status(), `${response.url()} → ${text.slice(0, 300)}`).toBe(status);
  return (text ? JSON.parse(text) : null) as T;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  /** Authenticated API client (call `dispose()` via the fixture). */
  api: APIRequestContext;
  storageState: StorageState;
}

/** Signs up a brand-new account through better-auth (auto signed in). */
export async function signUpUser(
  options: { name?: string; password?: string } = {}
): Promise<TestUser> {
  const suffix = uniqueSuffix();
  const email = `e2e-${suffix}@example.test`;
  const password = options.password ?? `pw-${suffix}-E2E`;
  const name = options.name ?? `E2E ${suffix.slice(-6)}`;
  const api = await newApi({ headers: { "X-Forwarded-For": uniqueTestIp() } });
  const res = await api.post("/api/auth/sign-up/email", {
    data: { email, password, name },
  });
  const body = await expectJson<{ user: { id: string } }>(res, 200);
  return { id: body.user.id, email, password, name, api, storageState: await api.storageState() };
}

/** Signs in an existing account through better-auth. */
export async function signInUser(email: string, password = SEED_PASSWORD) {
  const api = await newApi({ headers: { "X-Forwarded-For": uniqueTestIp() } });
  const res = await api.post("/api/auth/sign-in/email", { data: { email, password } });
  const body = await expectJson<{ user: { id: string } }>(res, 200);
  return { id: body.user.id, api, storageState: await api.storageState() };
}

/** Small bbox (pins mode) around a point. */
export function bboxAround(lat: number, lng: number, delta = 0.01) {
  return {
    minLat: String(lat - delta),
    maxLat: String(lat + delta),
    minLng: String(lng - delta),
    maxLng: String(lng + delta),
  };
}

/** Seeded pins near Sultanahmet (newest first). */
export async function pinsNear(
  api: APIRequestContext,
  at: { lat: number; lng: number } = ISTANBUL,
  delta = 0.01
): Promise<PinSummary[]> {
  const res = await api.get("/api/pins", { params: { ...bboxAround(at.lat, at.lng, delta), scope: "all" } });
  const body = await expectJson<PinsInBoundsResponse>(res, 200);
  return body.pins;
}

/**
 * A random existing pin that matches `filter`, so parallel tests (and
 * repeated runs) rarely touch the same pin.
 */
export async function pickPin(
  api: APIRequestContext,
  filter: (pin: PinSummary) => boolean = () => true,
  at = ISTANBUL
): Promise<PinSummary> {
  const pins = (await pinsNear(api, at, 0.02)).filter(
    (p) => p.user.display_name !== null && filter(p)
  );
  expect(pins.length, "seeded pins near Istanbul (run `npm run db:seed`?)").toBeGreaterThan(0);
  return pins[Math.floor(Math.random() * pins.length)];
}

export async function getComments(api: APIRequestContext, pinId: string, sort = "newest") {
  const res = await api.get(`/api/pins/${pinId}/comments`, { params: { sort, limit: "50" } });
  return expectJson<PinCommentsResponse>(res, 200);
}

/** Drops a pin at `at` with a GPS fix right there (passes the distance rule). */
export async function createPin(
  api: APIRequestContext,
  input: { name: string; comment: string; at?: { lat: number; lng: number } }
): Promise<CreatePinResponse> {
  const at = input.at ?? ISTANBUL;
  const res = await api.post("/api/pins", {
    multipart: {
      name: input.name,
      comment: input.comment,
      lat: String(at.lat),
      lng: String(at.lng),
      user_lat: String(at.lat),
      user_lng: String(at.lng),
      accuracy: "10",
    },
  });
  return expectJson<CreatePinResponse>(res, 201);
}

export async function postComment(api: APIRequestContext, pinId: string, text: string) {
  return api.post(`/api/pins/${pinId}/comments`, { data: { text } });
}

export async function deleteComment(api: APIRequestContext, commentId: string) {
  const res = await api.delete(`/api/comments/${commentId}`);
  expect([200, 404]).toContain(res.status());
}

export type { CommentItem, PinSummary };
