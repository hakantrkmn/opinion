import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { pushTokens } from "@/server/db/schema/app";
import { sendApns } from "./push/apns";
import { sendFcm } from "./push/fcm";
import {
  isValidPushToken,
  type PushDevice,
  type PushPayload,
  type PushPlatform,
} from "./push/payload";

export type { PushDevice, PushPayload, PushPlatform } from "./push/payload";

export type RegisterTokenInput = {
  userId: string;
  /** Raw APNs device token (hex) on iOS, FCM registration token on Android. */
  token: string;
  platform: PushPlatform;
  deviceName?: string | null;
};

export type SendResult = {
  sent: number;
  failed: number;
  deactivated: number;
  recipientCount: number;
};

export class InvalidPushTokenError extends Error {
  constructor() {
    super("Invalid push token");
    this.name = "InvalidPushTokenError";
  }
}

async function deactivateTokens(tokens: string[]): Promise<number> {
  const unique = [...new Set(tokens)];
  if (unique.length === 0) return 0;
  try {
    await db
      .update(pushTokens)
      .set({ isActive: false })
      .where(inArray(pushTokens.token, unique));
    return unique.length;
  } catch (error) {
    console.error("[push] deactivateTokens error:", error);
    return 0;
  }
}

const deviceColumns = { token: pushTokens.token, platform: pushTokens.platform };

function toDevices(rows: Array<{ token: string; platform: string }>): PushDevice[] {
  return rows.flatMap((r) =>
    r.platform === "ios" || r.platform === "android" ? [{ token: r.token, platform: r.platform }] : []
  );
}

export const pushService = {
  /**
   * Upsert by token: a device token belongs to whoever registered it last
   * (e.g. after switching accounts on the same phone).
   */
  async registerToken(input: RegisterTokenInput): Promise<void> {
    if (!isValidPushToken(input.token, input.platform)) throw new InvalidPushTokenError();
    await db
      .insert(pushTokens)
      .values({
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        deviceName: input.deviceName ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: {
          userId: input.userId,
          platform: input.platform,
          deviceName: sql`COALESCE(excluded.device_name, ${pushTokens.deviceName})`,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
  },

  /** Remove a token on logout. Only the owner can unregister it. */
  async unregisterToken(userId: string, token: string): Promise<void> {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
  },

  deactivateTokens,

  async getActiveDevicesForUser(userId: string): Promise<PushDevice[]> {
    const rows = await db
      .select(deviceColumns)
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
    return toDevices(rows);
  },

  async getAllActiveDevices(): Promise<PushDevice[]> {
    const rows = await db.select(deviceColumns).from(pushTokens).where(eq(pushTokens.isActive, true));
    return toDevices(rows);
  },

  /**
   * Send one notification to many devices: iOS through APNs, Android through
   * FCM, in parallel. Tokens the provider reports as gone are deactivated.
   */
  async sendToDevices(devices: PushDevice[], payload: PushPayload): Promise<SendResult> {
    const ios = new Set<string>();
    const android = new Set<string>();
    for (const d of devices) {
      if (!isValidPushToken(d.token, d.platform)) continue;
      (d.platform === "ios" ? ios : android).add(d.token);
    }

    const [apns, fcm] = await Promise.all([
      sendApns([...ios], payload).catch((error) => {
        console.error("[push] APNs send failed:", error);
        return { sent: 0, failed: ios.size, dead: [] };
      }),
      sendFcm([...android], payload).catch((error) => {
        console.error("[push] FCM send failed:", error);
        return { sent: 0, failed: android.size, dead: [] };
      }),
    ]);

    return {
      sent: apns.sent + fcm.sent,
      failed: apns.failed + fcm.failed,
      deactivated: await deactivateTokens([...apns.dead, ...fcm.dead]),
      recipientCount: ios.size + android.size,
    };
  },
};

/** Convenience wrapper: notify every active device of one user. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const devices = await pushService.getActiveDevicesForUser(userId);
  return pushService.sendToDevices(devices, payload);
}
