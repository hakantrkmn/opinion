import "server-only";
import { randomBytes } from "crypto";
import { db, sql } from "@/server/db";
import type { SQL } from "drizzle-orm";
import { HttpError } from "@/server/http/api-helpers";
import { deleteUploadByUrl } from "@/server/uploads";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import { recordNotifications } from "@/server/services/inbox";
import { pushService } from "@/server/services/pushService";
import { pushCopy, recipientLocale } from "@/server/i18n/push-copy";
import {
  invisibleUserIdsSql,
  toIso,
  toUserSummary,
  userColumnsSql,
  visibleToViewerSql,
  type UserRow,
} from "@/server/services/pins/sql";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/server/services/pins/errors";
import { COMMUNITY_MAX_MEMBERS, COMMUNITY_MAX_PER_USER } from "@/constants/limits";
import {
  DEFAULT_COMMUNITY_COLOR,
  toCommunityColor,
  type CommunityColor,
} from "@/constants/community-colors";
import type {
  CommunityInvitePreview,
  CommunityMember,
  CommunityResponse,
  CommunitySummary,
  Paginated,
} from "@/types/api";

/**
 * Communities (tables `communities`, `community_members`,
 * `community_removals`) and community-only pins (`pins.community_id`). A
 * community is only visible to its members (the invite preview aside); only
 * the founder manages it. Its pins go with it. Lock order is
 * user → community, the same as deleteAccount (user first, then cascades).
 */

const notFound = () => HttpError.notFound("Community not found");

function newInviteCode(): string {
  return randomBytes(9).toString("base64url"); // 12 chars
}

/** Columns for a CommunitySummary from `communities c JOIN "user" u ON u.id = c.owner_id`. */
function summaryColumnsSql(viewerId: string): SQL {
  return sql`
    c.id, c.name, c.description, c.color, c.created_at, c.invite_code,
    (c.owner_id = ${viewerId}) AS is_owner,
    (SELECT count(*)::int FROM community_members m WHERE m.community_id = c.id) AS members_count,
    (SELECT count(*)::int FROM pins p WHERE p.community_id = c.id) AS pins_count,
    ${userColumnsSql}`;
}

interface SummaryRow extends UserRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string | Date;
  invite_code: string;
  is_owner: boolean;
  members_count: number | string;
  pins_count: number | string;
}

function toSummary(row: SummaryRow): CommunitySummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    owner: toUserSummary(row),
    members_count: Number(row.members_count),
    color: toCommunityColor(row.color),
    pins_count: Number(row.pins_count),
    is_owner: !!row.is_owner,
    created_at: toIso(row.created_at),
  };
}

function toResponse(row: SummaryRow): CommunityResponse {
  return {
    community: { ...toSummary(row), invite_code: row.is_owner ? row.invite_code : null },
  };
}

/** The viewer's communities, newest join first. */
export async function listMyCommunities(userId: string): Promise<CommunitySummary[]> {
  const rows = (await db.execute(sql`
    SELECT ${summaryColumnsSql(userId)}
    FROM community_members me
    JOIN communities c ON c.id = me.community_id
    JOIN "user" u ON u.id = c.owner_id
    WHERE me.user_id = ${userId}
    ORDER BY me.created_at DESC, c.id
    LIMIT ${COMMUNITY_MAX_PER_USER}
  `)) as unknown as SummaryRow[];
  return rows.map(toSummary);
}

async function getRow(communityId: string, viewerId: string): Promise<SummaryRow | null> {
  const [row] = (await db.execute(sql`
    SELECT ${summaryColumnsSql(viewerId)}
    FROM communities c
    JOIN "user" u ON u.id = c.owner_id
    WHERE c.id = ${communityId}
      AND EXISTS (
        SELECT 1 FROM community_members m
        WHERE m.community_id = c.id AND m.user_id = ${viewerId}
      )
  `)) as unknown as SummaryRow[];
  return row ?? null;
}

/** Members only; 404 for everyone else (existence is not revealed). */
export async function getCommunity(
  communityId: string,
  viewerId: string
): Promise<CommunityResponse> {
  const row = await getRow(communityId, viewerId);
  if (!row) throw notFound();
  return toResponse(row);
}

/** Throws 404 unless the viewer is a member. */
export async function assertCommunityMember(
  communityId: string,
  viewerId: string | null
): Promise<void> {
  if (!viewerId) throw notFound();
  const rows = await db.execute(sql`
    SELECT 1 FROM community_members
    WHERE community_id = ${communityId} AND user_id = ${viewerId}
  `);
  if (rows.length === 0) throw notFound();
}

/** 404 for non-members, 403 for members who are not the founder. */
async function assertOwner(communityId: string, userId: string): Promise<void> {
  const row = await getRow(communityId, userId);
  if (!row) throw notFound();
  if (!row.is_owner) throw HttpError.forbidden("Only the founder can manage this community");
}

/**
 * Locks the user (live accounts only) and checks the per-user limit.
 * Must run first in the transaction (lock order user → community). The
 * count is a separate statement: under READ COMMITTED a count in the locking
 * statement would use the snapshot from before the lock wait and miss a
 * concurrent join that just committed.
 */
async function lockUserWithRoom(tx: Pick<typeof db, "execute">, userId: string) {
  const locked = await tx.execute(sql`
    SELECT 1 FROM "user" WHERE id = ${userId} AND deleted_at IS NULL FOR NO KEY UPDATE
  `);
  if (locked.length === 0) throw HttpError.forbidden("Account not found");
  const [u] = (await tx.execute(sql`
    SELECT count(*)::int AS n FROM community_members WHERE user_id = ${userId}
  `)) as unknown as Array<{ n: number }>;
  if (Number(u.n) >= COMMUNITY_MAX_PER_USER) {
    throw new HttpError(
      409,
      "CONFLICT",
      `You can be in at most ${COMMUNITY_MAX_PER_USER} communities`,
      { reason: "limit" }
    );
  }
}

export async function createCommunity(
  userId: string,
  input: { name: string; description?: string | null; color?: CommunityColor }
): Promise<CommunityResponse> {
  const id = await db.transaction(async (tx) => {
    await lockUserWithRoom(tx, userId);
    const [row] = (await tx.execute(sql`
      INSERT INTO communities (id, owner_id, name, description, color, invite_code)
      VALUES (${crypto.randomUUID()}, ${userId}, ${input.name},
              ${input.description || null}, ${input.color ?? DEFAULT_COMMUNITY_COLOR},
              ${newInviteCode()})
      RETURNING id
    `)) as unknown as Array<{ id: string }>;
    await tx.execute(sql`
      INSERT INTO community_members (community_id, user_id) VALUES (${row.id}, ${userId})
    `);
    return row.id;
  });
  return getCommunity(id, userId);
}

export async function updateCommunity(
  communityId: string,
  userId: string,
  patch: { name?: string; description?: string | null; color?: CommunityColor }
): Promise<CommunityResponse> {
  await assertOwner(communityId, userId);
  const sets: SQL[] = [sql`updated_at = now()`];
  if (patch.name !== undefined) sets.push(sql`name = ${patch.name}`);
  if (patch.description !== undefined) sets.push(sql`description = ${patch.description || null}`);
  if (patch.color !== undefined) sets.push(sql`color = ${patch.color}`);
  await db.execute(sql`
    UPDATE communities SET ${sql.join(sets, sql`, `)}
    WHERE id = ${communityId} AND owner_id = ${userId}
  `);
  return getCommunity(communityId, userId);
}

/**
 * Photo files of every opinion on the pins of the communities matching
 * `where` (alias `c`). Read before deleting them: the rows cascade away.
 */
export async function communityPinPhotoUrls(where: SQL): Promise<string[]> {
  const rows = (await db.execute(sql`
    SELECT cc.photo_url
    FROM communities c
    JOIN pins p ON p.community_id = c.id
    JOIN comments cc ON cc.pin_id = p.id
    WHERE ${where} AND cc.photo_url IS NOT NULL
  `)) as unknown as Array<{ photo_url: string }>;
  return rows.map((r) => r.photo_url);
}

/** Removes files after the delete committed; failures are only logged. */
async function deletePhotos(urls: string[]) {
  await Promise.all(urls.map((url) => deleteUploadByUrl(url)));
}

/**
 * Founder only. Members, removals, inbox rows and the community's pins
 * (with their opinions and photos) cascade.
 */
export async function deleteCommunity(communityId: string, userId: string): Promise<void> {
  await assertOwner(communityId, userId);
  const photos = await communityPinPhotoUrls(sql`c.id = ${communityId}`);
  await db.execute(sql`DELETE FROM communities WHERE id = ${communityId} AND owner_id = ${userId}`);
  await deletePhotos(photos);
}

/** Admin removal (moderation). Returns false when it does not exist. */
export async function deleteCommunityAsAdmin(communityId: string): Promise<boolean> {
  const photos = await communityPinPhotoUrls(sql`c.id = ${communityId}`);
  const rows = await db.execute(sql`DELETE FROM communities WHERE id = ${communityId} RETURNING id`);
  await deletePhotos(photos);
  return rows.length > 0;
}

/** Founder only: a fresh code; the old invite link stops working. */
export async function resetInviteCode(communityId: string, userId: string): Promise<string> {
  await assertOwner(communityId, userId);
  const code = newInviteCode();
  await db.execute(sql`
    UPDATE communities SET invite_code = ${code}, updated_at = now()
    WHERE id = ${communityId} AND owner_id = ${userId}
  `);
  return code;
}

/** Founder first, then newest members. Blocked and deleted users omitted. */
export async function listCommunityMembers(
  communityId: string,
  viewerId: string,
  page: OffsetPagination
): Promise<Paginated<CommunityMember>> {
  await assertCommunityMember(communityId, viewerId);
  const rows = (await db.execute(sql`
    SELECT ${userColumnsSql}, m.created_at AS joined_at, (m.user_id = c.owner_id) AS is_owner
    FROM community_members m
    JOIN communities c ON c.id = m.community_id
    JOIN "user" u ON u.id = m.user_id AND u.deleted_at IS NULL
    WHERE m.community_id = ${communityId}
      ${visibleToViewerSql(sql`m.user_id`, viewerId)}
    ORDER BY (m.user_id = c.owner_id) DESC, m.created_at DESC, m.user_id
    LIMIT ${page.limit + 1} OFFSET ${page.offset}
  `)) as unknown as Array<UserRow & { joined_at: string | Date; is_owner: boolean }>;
  return toPaginated(
    rows.map((r) => ({
      user: toUserSummary(r),
      is_owner: !!r.is_owner,
      joined_at: toIso(r.joined_at),
    })),
    page
  );
}

/**
 * The founder removes `targetId` (who cannot rejoin by link), or a member
 * removes themself (leave). The founder cannot leave.
 */
export async function removeCommunityMember(
  communityId: string,
  actorId: string,
  targetId: string
): Promise<void> {
  if (actorId === targetId) {
    const row = await getRow(communityId, actorId);
    if (!row) throw notFound();
    if (row.is_owner) {
      throw HttpError.badRequest("The founder cannot leave; delete the community instead");
    }
    await db.execute(sql`
      DELETE FROM community_members WHERE community_id = ${communityId} AND user_id = ${actorId}
    `);
    return;
  }

  await assertOwner(communityId, actorId);
  await db.transaction(async (tx) => {
    // Lock order user → community (as deleteAccount / community deletes do)
    // before touching member rows, so neither can deadlock with this.
    await tx.execute(sql`SELECT 1 FROM "user" WHERE id = ${targetId} FOR KEY SHARE`);
    const community = await tx.execute(
      sql`SELECT 1 FROM communities WHERE id = ${communityId} FOR NO KEY UPDATE`
    );
    if (community.length === 0) throw notFound();
    const removed = await tx.execute(sql`
      DELETE FROM community_members
      WHERE community_id = ${communityId} AND user_id = ${targetId}
      RETURNING user_id
    `);
    if (removed.length === 0) throw HttpError.notFound("Member not found");
    await tx.execute(sql`
      INSERT INTO community_removals (community_id, user_id)
      VALUES (${communityId}, ${targetId})
      ON CONFLICT DO NOTHING
    `);
  });
}

interface InviteRow extends UserRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  members_count: number | string;
  is_member: boolean;
}

async function findByInvite(code: string, viewerId: string | null): Promise<InviteRow | null> {
  const [row] = (await db.execute(sql`
    SELECT c.id, c.name, c.description, c.owner_id,
      (SELECT count(*)::int FROM community_members m WHERE m.community_id = c.id) AS members_count,
      ${
        viewerId
          ? sql`EXISTS (SELECT 1 FROM community_members m WHERE m.community_id = c.id AND m.user_id = ${viewerId})`
          : sql`false`
      } AS is_member,
      ${userColumnsSql}
    FROM communities c
    JOIN "user" u ON u.id = c.owner_id
    WHERE c.invite_code = ${code}
  `)) as unknown as InviteRow[];
  return row ?? null;
}

/** What the invite link shows: anyone holding the code may see it. */
export async function previewInvite(
  code: string,
  viewerId: string | null
): Promise<CommunityInvitePreview> {
  const row = await findByInvite(code, viewerId);
  if (!row) throw notFound();
  return {
    community: {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      owner: toUserSummary(row),
      members_count: Number(row.members_count),
    },
    is_member: !!row.is_member,
  };
}

/** Joins by invite code; idempotent for members. Notifies the founder. */
export async function joinByInvite(code: string, userId: string): Promise<CommunityResponse> {
  const found = await findByInvite(code, userId);
  if (!found) throw notFound();
  if (found.is_member) return getCommunity(found.id, userId);

  const joined = await db.transaction(async (tx) => {
    await lockUserWithRoom(tx, userId);
    // Lock first, then read in a fresh statement (see lockUserWithRoom).
    const locked = await tx.execute(sql`
      SELECT 1 FROM communities WHERE id = ${found.id} AND invite_code = ${code} FOR UPDATE
    `);
    if (locked.length === 0) throw notFound(); // deleted or code reset meanwhile
    const [c] = (await tx.execute(sql`
      SELECT c.owner_id,
        (SELECT count(*)::int FROM community_members m WHERE m.community_id = c.id) AS n,
        EXISTS (
          SELECT 1 FROM community_removals r WHERE r.community_id = c.id AND r.user_id = ${userId}
        ) AS removed,
        (c.owner_id IN ${invisibleUserIdsSql(userId)}) AS blocked
      FROM communities c
      WHERE c.id = ${found.id}
    `)) as unknown as Array<{ owner_id: string; n: number; removed: boolean; blocked: boolean }>;
    if (c.removed) {
      throw new HttpError(403, "FORBIDDEN", "You were removed from this community", {
        reason: "removed",
      });
    }
    if (c.blocked) {
      throw new HttpError(403, "FORBIDDEN", "You can't join this community", {
        reason: "blocked",
      });
    }
    if (Number(c.n) >= COMMUNITY_MAX_MEMBERS) {
      throw new HttpError(409, "CONFLICT", "This community is full", { reason: "full" });
    }
    try {
      await tx.execute(sql`
        INSERT INTO community_members (community_id, user_id) VALUES (${found.id}, ${userId})
      `);
    } catch (error) {
      // Joined concurrently (another tab): already a member.
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return null;
      throw error;
    }
    return { ownerId: c.owner_id };
  });

  if (joined) {
    void notifyCommunityJoined(found.id, found.name, joined.ownerId, userId).catch((error) =>
      console.error("notifyCommunityJoined failed:", error)
    );
  }
  return getCommunity(found.id, userId);
}

/** Leave + rejoin never pushes twice in this window. */
const JOIN_PUSH_COOLDOWN = "10 minutes";

async function notifyCommunityJoined(
  communityId: string,
  communityName: string,
  ownerId: string,
  joinerId: string
) {
  const [recorded] = await recordNotifications({
    recipientIds: [ownerId],
    type: "community_joined",
    groupTargetId: communityId,
    actorId: joinerId,
    communityId,
    pushCooldown: JOIN_PUSH_COOLDOWN,
  });
  if (!recorded?.should_push) return;
  const devices = await pushService.getActiveDevicesForUser(ownerId);
  if (devices.length === 0) return;
  const [row] = (await db.execute(sql`
    SELECT
      (SELECT COALESCE(display_name, name) FROM "user" WHERE id = ${joinerId}) AS joiner_name,
      (SELECT locale FROM "user" WHERE id = ${ownerId}) AS locale
  `)) as unknown as Array<{ joiner_name: string | null; locale: string | null }>;
  const l = recipientLocale(row?.locale);
  await pushService.sendToDevices(devices, {
    title: pushCopy.communityJoined(l, row?.joiner_name ?? null, recorded.count),
    body: communityName,
    data: { type: "community_joined", community_id: communityId },
  });
}

// ---------------------------------------------------------------- filters

/**
 * `AND <pin> is the community's own, or has an opinion by a member visible
 * to the viewer`. Callers must have checked membership
 * (assertCommunityMember).
 */
export function communityPinFilterSql(communityId: string, viewerId: string): SQL {
  return sql` AND (p.community_id = ${communityId} OR p.id IN (
    SELECT cc.pin_id
    FROM community_members m
    JOIN comments cc ON cc.user_id = m.user_id
    WHERE m.community_id = ${communityId}
      ${visibleToViewerSql(sql`m.user_id`, viewerId)}
  ))`;
}

/** `AND <comment c> is by a member`. Callers must have checked membership. */
export function communityCommentFilterSql(communityId: string): SQL {
  return sql` AND c.user_id IN (
    SELECT m.user_id FROM community_members m WHERE m.community_id = ${communityId}
  )`;
}
