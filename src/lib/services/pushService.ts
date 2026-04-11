import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { db } from "@/db";
import { pushTokens } from "@/db/schema/app";
import { eq, inArray, and } from "drizzle-orm";

const expo = new Expo();

export type RegisterTokenInput = {
  userId: string;
  token: string;
  platform: "ios" | "android";
  deviceName?: string | null;
};

export type SendResult = {
  sent: number;
  failed: number;
  deactivated: number;
  recipientCount: number;
};

export const pushService = {
  async registerToken(input: RegisterTokenInput): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!Expo.isExpoPushToken(input.token)) {
        return { success: false, error: "Invalid Expo push token" };
      }

      const [existing] = await db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.token, input.token));

      if (existing) {
        await db
          .update(pushTokens)
          .set({
            userId: input.userId,
            platform: input.platform,
            deviceName: input.deviceName ?? existing.deviceName,
            isActive: true,
            lastSeenAt: new Date(),
          })
          .where(eq(pushTokens.token, input.token));
      } else {
        await db.insert(pushTokens).values({
          userId: input.userId,
          token: input.token,
          platform: input.platform,
          deviceName: input.deviceName ?? null,
        });
      }
      return { success: true, error: null };
    } catch (error) {
      console.error("registerToken error:", error);
      return { success: false, error: "Failed to register push token" };
    }
  },

  async deactivateTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    try {
      await db
        .update(pushTokens)
        .set({ isActive: false })
        .where(inArray(pushTokens.token, tokens));
    } catch (error) {
      console.error("deactivateTokens error:", error);
    }
  },

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

  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, unknown> }
  ): Promise<SendResult> {
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
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

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (error) {
        console.error("Expo push chunk error:", error);
        result.failed += chunk.length;
      }
    }

    const tokensToDeactivate: string[] = [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        result.sent += 1;
      } else {
        result.failed += 1;
        console.error("[push] ticket error:", {
          token: validTokens[index],
          message: ticket.message,
          details: ticket.details,
        });
        const errCode = ticket.details?.error;
        if (errCode === "DeviceNotRegistered") {
          const offendingToken = validTokens[index];
          if (offendingToken) tokensToDeactivate.push(offendingToken);
        }
      }
    });

    if (tokensToDeactivate.length > 0) {
      await this.deactivateTokens(tokensToDeactivate);
      result.deactivated = tokensToDeactivate.length;
    }

    return result;
  },
};
