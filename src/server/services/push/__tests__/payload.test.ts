import { describe, expect, it } from "vitest";
import {
  apnsCustomData,
  credentialSource,
  fcmData,
  isDeadApnsResponse,
  isDeadFcmError,
  isValidPushToken,
} from "../payload";

const APNS_TOKEN = "a".repeat(64);
const FCM_TOKEN = `cX9${"_-".repeat(40)}:APA91b${"Abc123".repeat(20)}`;

describe("push token validation", () => {
  it("accepts native tokens for their own platform only", () => {
    expect(isValidPushToken(APNS_TOKEN, "ios")).toBe(true);
    expect(isValidPushToken(FCM_TOKEN, "android")).toBe(true);
    expect(isValidPushToken(FCM_TOKEN, "ios")).toBe(false);
    expect(isValidPushToken(APNS_TOKEN.slice(0, 40), "ios")).toBe(false);
  });

  it("rejects legacy Expo tokens", () => {
    const expo = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
    expect(isValidPushToken(expo, "ios")).toBe(false);
    expect(isValidPushToken(expo, "android")).toBe(false);
  });
});

describe("payload shaping", () => {
  const payload = {
    title: "Emre seni takip etmeye başladı",
    body: "Profiline göz at",
    data: { type: "comment_like", pinId: "p1", count: 3, latitude: 41.01, nested: { a: 1 }, skip: null },
  };

  it("puts APNs custom data at the top level and never overrides aps", () => {
    const data = apnsCustomData({ ...payload, data: { ...payload.data, aps: { badge: 9 } } });
    expect(data).toMatchObject({ type: "comment_like", pinId: "p1", count: 3 });
    expect(data).not.toHaveProperty("aps");
  });

  it("stringifies FCM data values and carries title/body", () => {
    expect(fcmData(payload)).toEqual({
      type: "comment_like",
      pinId: "p1",
      count: "3",
      latitude: "41.01",
      nested: '{"a":1}',
      title: payload.title,
      body: payload.body,
    });
  });
});

describe("dead token detection", () => {
  it("flags APNs tokens that will never deliver", () => {
    expect(isDeadApnsResponse(410, "Unregistered")).toBe(true);
    expect(isDeadApnsResponse(400, "BadDeviceToken")).toBe(true);
    expect(isDeadApnsResponse(400, "DeviceTokenNotForTopic")).toBe(true);
    expect(isDeadApnsResponse(403, "InvalidProviderToken")).toBe(false);
    expect(isDeadApnsResponse(429, "TooManyRequests")).toBe(false);
  });

  it("flags FCM tokens that are unregistered or malformed", () => {
    expect(isDeadFcmError("messaging/registration-token-not-registered")).toBe(true);
    expect(isDeadFcmError("messaging/invalid-registration-token")).toBe(true);
    expect(isDeadFcmError("messaging/third-party-auth-error")).toBe(false);
    expect(isDeadFcmError(undefined)).toBe(false);
  });
});

describe("credential env values", () => {
  it("keeps inline service-account JSON parseable", () => {
    const json = JSON.stringify({
      type: "service_account",
      project_id: "opinion-e5d0e",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEv\n-----END PRIVATE KEY-----\n",
    });
    const source = credentialSource(`  ${json}\n`);
    expect(source.kind).toBe("inline");
    const parsed = JSON.parse(source.kind === "inline" ? source.content : "");
    expect(parsed.private_key).toBe("-----BEGIN PRIVATE KEY-----\nMIIEv\n-----END PRIVATE KEY-----\n");
  });

  it("restores escaped newlines in inline PEM", () => {
    expect(credentialSource("-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----")).toEqual({
      kind: "inline",
      content: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });
  });

  it("treats anything else as a file path", () => {
    expect(credentialSource(" /run/secrets/key.p8 ")).toEqual({ kind: "path", path: "/run/secrets/key.p8" });
  });
});
