import "server-only";
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushReceiptId,
} from "expo-server-sdk";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { pushTokens } from "@/server/db/schema/app";

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : undefined
);

/** Expo recommends waiting before fetching receipts; they are kept ~24h. */
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

export type RegisterTokenInput = {
  userId: string;
  token: string;
  platform: "ios" | "android";
  deviceName?: string | null;
};

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type SendResult = {
  sent: number;
  failed: number;
  deactivated: number;
  recipientCount: number;
};

export class InvalidPushTokenError extends Error {
  constructor() {
    super("Invalid Expo push token");
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

/**
 * Fetch delivery receipts and deactivate tokens Expo reports as
 * DeviceNotRegistered. `receiptTokens` maps receipt id → push token.
 */
async function processReceipts(
  receiptTokens: Map<ExpoPushReceiptId, string>
): Promise<number> {
  const ids = [...receiptTokens.keys()];
  if (ids.length === 0) return 0;
  const dead: string[] = [];
  for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status !== "error") continue;
        const token = receiptTokens.get(id);
        if (receipt.details?.error === "DeviceNotRegistered" && token) {
          dead.push(token);
        } else {
          console.error("[push] receipt error:", receipt.message, receipt.details);
        }
      }
    } catch (error) {
      console.error("[push] receipt fetch failed:", error);
    }
  }
  return deactivateTokens(dead);
}

export const pushService = {
  /**
   * Upsert by token: a device token belongs to whoever registered it last
   * (e.g. after switching accounts on the same phone).
   */
  async registerToken(input: RegisterTokenInput): Promise<void> {
    if (!Expo.isExpoPushToken(input.token)) throw new InvalidPushTokenError();
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

  async getActiveTokensForUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
    return rows.map((r) => r.token);
  },

  async getAllActiveTokens(): Promise<string[]> {
    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.isActive, true));
    return rows.map((r) => r.token);
  },

  /**
   * Send one notification to many tokens. Tickets are matched to tokens per
   * chunk (Expo returns tickets in message order), so a failed chunk can't
   * shift the mapping. DeviceNotRegistered tickets deactivate immediately;
   * receipts are checked later in the background.
   */
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<SendResult> {
    const validTokens = [...new Set(tokens)].filter((t) => Expo.isExpoPushToken(t));
    const result: SendResult = {
      sent: 0,
      failed: 0,
      deactivated: 0,
      recipientCount: validTokens.length,
    };
    if (validTokens.length === 0) return result;

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const deadTokens: string[] = [];
    const receiptTokens = new Map<ExpoPushReceiptId, string>();

    for (const chunk of expo.chunkPushNotifications(messages)) {
      let tickets;
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error("[push] chunk send failed:", error);
        result.failed += chunk.length;
        continue;
      }
      tickets.forEach((ticket, i) => {
        const token = chunk[i]?.to as string | undefined;
        if (ticket.status === "ok") {
          result.sent += 1;
          if (token) receiptTokens.set(ticket.id, token);
          return;
        }
        result.failed += 1;
        if (ticket.details?.error === "DeviceNotRegistered" && token) {
          deadTokens.push(token);
        } else {
          console.error("[push] ticket error:", ticket.message, ticket.details);
        }
      });
    }

    result.deactivated = await deactivateTokens(deadTokens);

    if (receiptTokens.size > 0) {
      // Fire-and-forget: single long-lived Node process, so a timer is fine.
      setTimeout(() => {
        void processReceipts(receiptTokens).catch((error) =>
          console.error("[push] receipt processing failed:", error)
        );
      }, RECEIPT_DELAY_MS).unref?.();
    }

    return result;
  },
};

/** Convenience wrapper: notify every active device of one user. */
export async function sendToUser(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  const tokens = await pushService.getActiveTokensForUser(userId);
  return pushService.sendToTokens(tokens, payload);
}
