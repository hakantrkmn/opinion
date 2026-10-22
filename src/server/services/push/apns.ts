import "server-only";
import { readFileSync } from "node:fs";
import apn from "@parse/node-apn";
import {
  apnsCustomData,
  credentialSource,
  emptyReport,
  isDeadApnsResponse,
  type DeliveryReport,
  type PushPayload,
} from "./payload";

/**
 * Direct APNs delivery with token-based (.p8) auth.
 *
 *   APNS_KEY         path to AuthKey_XXXX.p8, or its PEM content
 *   APNS_KEY_ID      key id from Apple Developer → Keys
 *   APNS_TEAM_ID     Apple team id
 *   APNS_BUNDLE_ID   app bundle id (default com.hakanturkmen.opinion)
 *   APNS_PRODUCTION  "true" / "false" (default: NODE_ENV === "production")
 *
 * Debug builds get sandbox tokens and App Store / TestFlight builds get
 * production ones, so a BadDeviceToken from the primary environment is retried
 * once against the other before the token is treated as dead.
 */

type ApnsConfig = { token: apn.ProviderToken; topic: string; production: boolean };

let config: ApnsConfig | null | undefined;
const providers = new Map<boolean, apn.Provider>();

function loadConfig(): ApnsConfig | null {
  if (config !== undefined) return config;
  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } = process.env;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    console.warn("[push] APNs is not configured (APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID); iOS pushes are skipped");
    config = null;
    return config;
  }
  try {
    const source = credentialSource(APNS_KEY);
    const key = source.kind === "inline" ? source.content : readFileSync(source.path, "utf8");
    const flag = process.env.APNS_PRODUCTION;
    config = {
      token: { key, keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID },
      topic: process.env.APNS_BUNDLE_ID || "com.hakanturkmen.opinion",
      production: flag ? flag === "true" : process.env.NODE_ENV === "production",
    };
  } catch (error) {
    console.error("[push] APNs key could not be loaded:", error);
    config = null;
  }
  return config;
}

function provider(cfg: ApnsConfig, production: boolean): apn.Provider {
  let p = providers.get(production);
  if (!p) {
    p = new apn.Provider({ token: cfg.token, production });
    providers.set(production, p);
  }
  return p;
}

function notification(cfg: ApnsConfig, payload: PushPayload): apn.Notification {
  const note = new apn.Notification(apnsCustomData(payload));
  note.topic = cfg.topic;
  note.pushType = "alert";
  note.priority = 10;
  note.sound = "default";
  note.alert = { title: payload.title, body: payload.body };
  return note;
}

export const apnsEnabled = () => loadConfig() !== null;

export async function sendApns(tokens: string[], payload: PushPayload): Promise<DeliveryReport> {
  const report = emptyReport();
  if (tokens.length === 0) return report;
  const cfg = loadConfig();
  if (!cfg) {
    report.failed = tokens.length;
    return report;
  }

  const note = notification(cfg, payload);
  const retry: string[] = [];

  const first = await provider(cfg, cfg.production).send(note, tokens);
  // node-apn reports per-device failures in `failed`; it only throws on misconfiguration.
  report.sent += first.sent.length;
  for (const failure of first.failed) {
    const reason = failure.response?.reason;
    if (reason === "BadDeviceToken") {
      retry.push(failure.device);
    } else {
      report.failed += 1;
      if (isDeadApnsResponse(failure.status, reason)) report.dead.push(failure.device);
      else console.error("[push] APNs error:", failure.status, reason ?? failure.error?.message);
    }
  }

  if (retry.length > 0) {
    const second = await provider(cfg, !cfg.production).send(note, retry);
    report.sent += second.sent.length;
    for (const failure of second.failed) {
      report.failed += 1;
      const reason = failure.response?.reason;
      if (isDeadApnsResponse(failure.status, reason)) report.dead.push(failure.device);
      else console.error("[push] APNs error:", failure.status, reason ?? failure.error?.message);
    }
  }

  return report;
}
