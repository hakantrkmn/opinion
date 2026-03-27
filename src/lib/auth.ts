import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";

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
          // Initialize user stats when a new user is created
          // The DB trigger on the "user" table also handles this,
          // but this is a safety net
          try {
            await db.execute(
              `INSERT INTO user_stats (user_id, total_pins, total_comments, total_likes_received, total_dislikes_received, total_votes_given, last_activity_at)
               VALUES ('${user.id}', 0, 0, 0, 0, 0, NOW())
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
