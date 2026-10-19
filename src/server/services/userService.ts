import "server-only";
import * as users from "@/server/services/users";

/**
 * @deprecated Compatibility namespace — import from
 * "@/server/services/users" instead. (user_stats are trigger-maintained, so
 * the old refreshUserStats helper is gone.)
 */
export const userService = users;
