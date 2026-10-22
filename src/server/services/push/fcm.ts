import "server-only";
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import {
  credentialSource,
  emptyReport,
  fcmData,
  isDeadFcmError,
  type DeliveryReport,
  type PushPayload,
} from "./payload";

/**
 * Direct FCM (HTTP v1) delivery through firebase-admin.
 *
 *   FCM_SERVICE_ACCOUNT  path to the Firebase service-account JSON, or its content
 */

const APP_NAME = "push";
/** sendEachForMulticast accepts at most 500 tokens per call. */
const MULTICAST_LIMIT = 500;

let app: App | null | undefined;

function loadApp(): App | null {
  if (app !== undefined) return app;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn("[push] FCM is not configured (FCM_SERVICE_ACCOUNT); Android pushes are skipped");
    app = null;
    return app;
  }
  try {
    const source = credentialSource(raw);
    const json = source.kind === "inline" ? source.content : readFileSync(source.path, "utf8");
    const account = JSON.parse(json) as ServiceAccount & { project_id?: string };
    app =
      getApps().find((a) => a.name === APP_NAME) ??
      initializeApp({ credential: cert(account), projectId: account.project_id }, APP_NAME);
  } catch (error) {
    console.error("[push] FCM service account could not be loaded:", error);
    app = null;
  }
  return app;
}

export const fcmEnabled = () => loadApp() !== null;

export async function sendFcm(tokens: string[], payload: PushPayload): Promise<DeliveryReport> {
  const report = emptyReport();
  if (tokens.length === 0) return report;
  const firebase = loadApp();
  if (!firebase) {
    report.failed = tokens.length;
    return report;
  }

  const messaging = getMessaging(firebase);
  const data = fcmData(payload);

  for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
    const chunk = tokens.slice(i, i + MULTICAST_LIMIT);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        data,
        android: { priority: "high" },
      });
      report.sent += response.successCount;
      response.responses.forEach((r, index) => {
        if (r.success) return;
        report.failed += 1;
        const code = r.error?.code;
        if (isDeadFcmError(code)) report.dead.push(chunk[index]);
        else console.error("[push] FCM error:", code, r.error?.message);
      });
    } catch (error) {
      console.error("[push] FCM chunk send failed:", error);
      report.failed += chunk.length;
    }
  }

  return report;
}
