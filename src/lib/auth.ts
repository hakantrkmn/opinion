import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  plugins: [expo()],
  trustedOrigins: [
    "opinionmobile://",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
      avatarUrl: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Copy name to display_name if not set
          try {
            if (user.name) {
              await db
                .update(schema.user)
                .set({ displayName: user.name })
                .where(
                  and(
                    eq(schema.user.id, user.id),
                    isNull(schema.user.displayName)
                  )
                );
            }
          } catch {
            // Non-critical, display_name can be set later
          }

          // Initialize user stats when a new user is created
          try {
            await db.execute(
              sql`INSERT INTO user_stats (user_id, total_pins, total_comments, total_likes_received, total_dislikes_received, total_votes_given, last_activity_at)
               VALUES (${user.id}, 0, 0, 0, 0, 0, NOW())
               ON CONFLICT (user_id) DO NOTHING`
            );
          } catch {
            // DB trigger will handle this if the hook fails
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
