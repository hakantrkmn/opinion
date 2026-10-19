/**
 * Local test data. WIPES all app data, then creates:
 *  - 40 users  user1@example.test … user40@example.test  (password "password1234")
 *    user40 is a soft-deleted account ("Deleted user") that still owns pins
 *    which other people commented on,
 *  - 1 admin   admin@example.test                        (password "password1234"),
 *  - ~20k pins: dense clusters in Istanbul, Ankara, Izmir + a few hundred
 *    worldwide (incl. a handful next to the antimeridian), each with a first
 *    comment; extra comments / votes on a subset; follows; two blocks.
 *
 *   npm run db:seed          (refuses non-local databases unless --force)
 *
 * Triggers are disabled during the bulk load (session_replication_role =
 * replica); every counter and user_stats row is recomputed afterwards with
 * populate_user_stats().
 */
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

const PASSWORD = "password1234";
const USER_COUNT = 40;
const DELETED_USER_INDEX = 40;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL is not set");
  process.exit(1);
}
const force = process.argv.includes("--force");
const host = new URL(url).hostname;
if (!force && !["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host)) {
  console.error(`[seed] refusing to wipe non-local database host "${host}" (pass --force)`);
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !force) {
  console.error("[seed] refusing to run with NODE_ENV=production (pass --force)");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261019);
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const pad = (n: number) => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// Content vocabulary
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Ayşe", "Mehmet", "Zeynep", "Can", "Elif", "Emre", "Deniz", "Burak", "Selin", "Mert",
  "Ece", "Kerem", "Defne", "Arda", "İrem", "Ozan", "Melis", "Barış", "Ceren", "Kaan",
];
const LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Aydın", "Öztürk", "Arslan"];
const PLACE_KINDS = [
  "Kahveci", "Simitçi", "Balıkçı", "Park", "Manzara Noktası", "Kitapçı", "Fırın", "Meyhane",
  "Sahil", "Çay Bahçesi", "Pazar", "Müze", "Köprü", "Durak", "Lokanta", "Pastane", "Spor Salonu",
  "Kütüphane", "Vapur İskelesi", "Sokak Lezzeti",
];
const ADJECTIVES = ["Eski", "Yeni", "Küçük", "Büyük", "Gizli", "Meşhur", "Sakin", "Kalabalık", "Mavi", "Yeşil"];
const COMMENTS = [
  "Harika bir yer, kesinlikle tavsiye ederim.",
  "Fiyatlar biraz yüksek ama kalite iyi.",
  "Hafta sonu çok kalabalık oluyor.",
  "Manzarası muhteşem, gün batımında gelin.",
  "Personel çok ilgili ve güler yüzlü.",
  "Beklediğim gibi değildi, tekrar gelmem.",
  "Sabah erken saatlerde çok sakin.",
  "Çocuklu aileler için uygun.",
  "Otopark sorunu var, toplu taşıma ile gelin.",
  "Great place, would come back!",
  "Hidden gem, nobody knows about it yet.",
  "Overrated in my opinion.",
  "Best coffee in the neighbourhood.",
  "Nice view but too noisy at night.",
];

interface Hotspot {
  lat: number;
  lng: number;
  sigma: number;
  weight: number;
}
const CITIES: Array<{ name: string; count: number; spots: Hotspot[] }> = [
  {
    name: "İstanbul",
    count: 9000,
    spots: [
      { lat: 41.0082, lng: 28.9784, sigma: 0.05, weight: 3 }, // Sultanahmet / Fatih
      { lat: 41.0369, lng: 28.985, sigma: 0.02, weight: 3 }, // Taksim
      { lat: 40.9903, lng: 29.0291, sigma: 0.025, weight: 3 }, // Kadıköy
      { lat: 41.0422, lng: 29.0083, sigma: 0.02, weight: 2 }, // Beşiktaş
      { lat: 41.03, lng: 29.0, sigma: 0.15, weight: 3 }, // greater city
    ],
  },
  {
    name: "Ankara",
    count: 5500,
    spots: [
      { lat: 39.9208, lng: 32.8541, sigma: 0.03, weight: 3 }, // Kızılay
      { lat: 39.9334, lng: 32.8597, sigma: 0.08, weight: 2 },
      { lat: 39.9, lng: 32.75, sigma: 0.1, weight: 1 },
    ],
  },
  {
    name: "İzmir",
    count: 5000,
    spots: [
      { lat: 38.4192, lng: 27.1287, sigma: 0.03, weight: 3 }, // Konak / Alsancak
      { lat: 38.4602, lng: 27.0915, sigma: 0.03, weight: 2 }, // Karşıyaka
      { lat: 38.4237, lng: 27.1428, sigma: 0.1, weight: 2 },
    ],
  },
];
const WORLD_CITIES: Array<[string, number, number]> = [
  ["London", 51.5074, -0.1278], ["Paris", 48.8566, 2.3522], ["Berlin", 52.52, 13.405],
  ["New York", 40.7128, -74.006], ["Tokyo", 35.6762, 139.6503], ["Sydney", -33.8688, 151.2093],
  ["São Paulo", -23.5505, -46.6333], ["Cairo", 30.0444, 31.2357], ["Moscow", 55.7558, 37.6173],
  ["Mumbai", 19.076, 72.8777], ["Cape Town", -33.9249, 18.4241], ["Mexico City", 19.4326, -99.1332],
  ["Reykjavík", 64.1466, -21.9426], ["Auckland", -36.8485, 174.7633], ["Anchorage", 61.2181, -149.9003],
  ["Baku", 40.4093, 49.8671], ["Tbilisi", 41.7151, 44.8271], ["Athens", 37.9838, 23.7275],
  ["Rome", 41.9028, 12.4964], ["Madrid", 40.4168, -3.7038], ["Antalya", 36.8969, 30.7133],
  ["Trabzon", 41.0027, 39.7168], ["Bursa", 40.1885, 29.061], ["Eskişehir", 39.7767, 30.5206],
];
// Points on both sides of the antimeridian (Fiji / Chukotka / Samoa).
const ANTIMERIDIAN: Array<[number, number]> = [
  [-17.8, 178.4], [-16.5, 179.9], [-16.6, -179.95], [-17.0, -179.8],
  [65.0, 179.5], [65.1, -179.6], [-13.8, -172.1], [-18.1, 178.45],
];

function sampleHotspot(spots: Hotspot[]): { lat: number; lng: number } {
  const total = spots.reduce((s, h) => s + h.weight, 0);
  let r = rand() * total;
  let spot = spots[0];
  for (const h of spots) {
    r -= h.weight;
    if (r <= 0) {
      spot = h;
      break;
    }
  }
  return { lat: spot.lat + gauss() * spot.sigma, lng: spot.lng + gauss() * spot.sigma * 1.3 };
}

const DAY_MS = 86_400_000;
const NOW = Date.now();
const randomPastDate = (maxDays = 365) => new Date(NOW - rand() * maxDays * DAY_MS);

// ---------------------------------------------------------------------------
// Build rows in memory
// ---------------------------------------------------------------------------
interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  deleted: boolean;
  createdAt: Date;
}
interface PinRow {
  id: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: Date;
}
interface CommentRow {
  id: string;
  pinId: string;
  userId: string;
  text: string;
  isFirst: boolean;
  createdAt: Date;
}
interface VoteRow {
  id: string;
  commentId: string;
  userId: string;
  value: 1 | -1;
  createdAt: Date;
}

function buildData() {
  const users: UserRow[] = [];
  for (let i = 1; i <= USER_COUNT; i++) {
    const deleted = i === DELETED_USER_INDEX;
    users.push({
      id: `seed_user_${pad(i)}`,
      email: deleted ? `deleted-seed_user_${pad(i)}@deleted.local` : `user${i}@example.test`,
      name: deleted ? "Deleted user" : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      role: "user",
      deleted,
      createdAt: new Date(NOW - 400 * DAY_MS + i * DAY_MS),
    });
  }
  users.push({
    id: "seed_admin",
    email: "admin@example.test",
    name: "Admin",
    role: "admin",
    deleted: false,
    createdAt: new Date(NOW - 420 * DAY_MS),
  });
  const activeUsers = users.filter((u) => !u.deleted);

  const pins: PinRow[] = [];
  const comments: CommentRow[] = [];
  const commentKeys = new Set<string>();
  let pinSeq = 0;
  let commentSeq = 0;

  const addComment = (pinId: string, userId: string, isFirst: boolean, after: Date) => {
    const key = `${userId}:${pinId}`;
    if (commentKeys.has(key)) return null;
    commentKeys.add(key);
    const createdAt = new Date(
      Math.min(NOW, after.getTime() + (isFirst ? 0 : rand() * 30 * DAY_MS))
    );
    const c: CommentRow = {
      id: `seed_c_${++commentSeq}`,
      pinId,
      userId,
      text: pick(COMMENTS),
      isFirst,
      createdAt,
    };
    comments.push(c);
    return c;
  };

  const addPin = (lat: number, lng: number, label: string) => {
    const owner = rand() < 0.004 ? users[DELETED_USER_INDEX - 1] : pick(users.slice(0, USER_COUNT - 1));
    const createdAt = randomPastDate();
    const pin: PinRow = {
      id: `seed_p_${++pinSeq}`,
      userId: owner.id,
      name: `${pick(ADJECTIVES)} ${pick(PLACE_KINDS)} · ${label}`,
      lat: Math.max(-85, Math.min(85, lat)),
      lng: ((((lng + 180) % 360) + 360) % 360) - 180,
      createdAt,
    };
    pins.push(pin);
    if (owner.deleted) {
      // Deleted owner: their own first comment is gone, others remain.
      for (let k = 0, n = randInt(1, 3); k < n; k++) addComment(pin.id, pick(activeUsers).id, false, createdAt);
    } else {
      addComment(pin.id, owner.id, true, createdAt);
    }
  };

  for (const city of CITIES) {
    for (let i = 0; i < city.count; i++) {
      const p = sampleHotspot(city.spots);
      addPin(p.lat, p.lng, city.name);
    }
  }
  for (let i = 0; i < 300; i++) {
    const [name, lat, lng] = pick(WORLD_CITIES);
    addPin(lat + gauss() * 0.08, lng + gauss() * 0.1, name);
  }
  for (let i = 0; i < 150; i++) {
    addPin(-55 + rand() * 125, -180 + rand() * 360, "Dünya");
  }
  for (const [lat, lng] of ANTIMERIDIAN) addPin(lat, lng, "Antimeridian");

  // Extra comments on ~15% of pins.
  for (const pin of pins) {
    if (rand() > 0.15) continue;
    for (let k = 0, n = randInt(1, 6); k < n; k++) addComment(pin.id, pick(activeUsers).id, false, pin.createdAt);
  }

  // Votes on ~35% of comments, never on your own comment.
  const votes: VoteRow[] = [];
  let voteSeq = 0;
  for (const c of comments) {
    if (rand() > 0.35) continue;
    const voters = new Set<string>();
    for (let k = 0, n = randInt(1, 12); k < n; k++) {
      const v = pick(activeUsers).id;
      if (v === c.userId || voters.has(v)) continue;
      voters.add(v);
      votes.push({
        id: `seed_v_${++voteSeq}`,
        commentId: c.id,
        userId: v,
        value: rand() < 0.8 ? 1 : -1,
        createdAt: new Date(Math.min(NOW, c.createdAt.getTime() + rand() * 10 * DAY_MS)),
      });
    }
  }

  // Follows: every active user follows 3–10 others.
  const follows: Array<{ id: string; followerId: string; followingId: string }> = [];
  for (const u of activeUsers) {
    const targets = new Set<string>();
    for (let k = 0, n = randInt(3, 10); k < n; k++) {
      const t = pick(activeUsers).id;
      if (t !== u.id) targets.add(t);
    }
    for (const t of targets) follows.push({ id: `seed_f_${follows.length + 1}`, followerId: u.id, followingId: t });
  }

  // Blocks (user1 ⟂ user2 and user3 ⟂ user1); drop follows between them.
  const blocks = [
    { blockerId: "seed_user_01", blockedId: "seed_user_02" },
    { blockerId: "seed_user_03", blockedId: "seed_user_01" },
  ];
  const blocked = new Set(blocks.flatMap((b) => [`${b.blockerId}>${b.blockedId}`, `${b.blockedId}>${b.blockerId}`]));
  const visibleFollows = follows.filter((f) => !blocked.has(`${f.followerId}>${f.followingId}`));

  return { users, pins, comments, votes, follows: visibleFollows, blocks };
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const started = Date.now();
  const data = buildData();
  const passwordHash = await hashPassword(PASSWORD);
  const sql = postgres(url!, { max: 1, onnotice: () => {} });

  try {
    await sql.begin(async (txSql) => {
      // postgres-js' TransactionSql type drops the call signature (TS quirk).
      const tx = txSql as unknown as postgres.Sql;
      await tx`SET LOCAL session_replication_role = replica`;
      await tx`
        TRUNCATE "user", session, account, verification, pins, comments, comment_votes,
          comment_like_notifications, user_stats, push_tokens, user_follows, reports,
          user_blocks, admin_audit_logs
        CASCADE
      `;

      await tx`
        INSERT INTO "user" ${tx(
          data.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            email_verified: !u.deleted,
            display_name: u.name,
            role: u.role,
            created_at: u.createdAt,
            updated_at: u.createdAt,
            deleted_at: u.deleted ? new Date(NOW - 5 * DAY_MS) : null,
          }))
        )}
      `;
      const withLogin = data.users.filter((u) => !u.deleted);
      await tx`
        INSERT INTO account ${tx(
          withLogin.map((u) => ({
            id: `seed_acc_${u.id}`,
            account_id: u.id,
            provider_id: "credential",
            user_id: u.id,
            password: passwordHash,
            created_at: u.createdAt,
            updated_at: u.createdAt,
          }))
        )}
      `;

      for (const part of chunks(data.pins, 5000)) {
        await tx`
          INSERT INTO pins (id, user_id, name, location, created_at, updated_at)
          SELECT t.id, t.user_id, t.name, ST_SetSRID(ST_MakePoint(t.lng, t.lat), 4326), t.ts, t.ts
          FROM unnest(
            ${part.map((p) => p.id)}::text[],
            ${part.map((p) => p.userId)}::text[],
            ${part.map((p) => p.name)}::text[],
            ${part.map((p) => p.lng)}::float8[],
            ${part.map((p) => p.lat)}::float8[],
            ${part.map((p) => p.createdAt.toISOString())}::timestamptz[]
          ) AS t(id, user_id, name, lng, lat, ts)
        `;
      }
      for (const part of chunks(data.comments, 5000)) {
        await tx`
          INSERT INTO comments (id, pin_id, user_id, text, is_first_comment, created_at, updated_at)
          SELECT t.id, t.pin_id, t.user_id, t.text, t.is_first, t.ts, t.ts
          FROM unnest(
            ${part.map((c) => c.id)}::text[],
            ${part.map((c) => c.pinId)}::text[],
            ${part.map((c) => c.userId)}::text[],
            ${part.map((c) => c.text)}::text[],
            ${part.map((c) => (c.isFirst ? "t" : "f"))}::text[]::bool[],
            ${part.map((c) => c.createdAt.toISOString())}::timestamptz[]
          ) AS t(id, pin_id, user_id, text, is_first, ts)
        `;
      }
      for (const part of chunks(data.votes, 10000)) {
        await tx`
          INSERT INTO comment_votes (id, comment_id, user_id, value, created_at)
          SELECT t.id, t.comment_id, t.user_id, t.value, t.ts
          FROM unnest(
            ${part.map((v) => v.id)}::text[],
            ${part.map((v) => v.commentId)}::text[],
            ${part.map((v) => v.userId)}::text[],
            ${part.map((v) => v.value)}::int2[],
            ${part.map((v) => v.createdAt.toISOString())}::timestamptz[]
          ) AS t(id, comment_id, user_id, value, ts)
        `;
      }
      await tx`
        INSERT INTO user_follows ${tx(
          data.follows.map((f) => ({ id: f.id, follower_id: f.followerId, following_id: f.followingId }))
        )}
      `;
      await tx`
        INSERT INTO user_blocks ${tx(
          data.blocks.map((b) => ({ blocker_id: b.blockerId, blocked_id: b.blockedId }))
        )}
      `;

      await tx`SET LOCAL session_replication_role = origin`;
      // Counters (pins.comments_count, comments.likes/dislikes) + user_stats.
      await tx`SELECT populate_user_stats()`;
    });

    await sql`ANALYZE`;

    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM "user") AS users,
        (SELECT count(*)::int FROM pins) AS pins,
        (SELECT count(*)::int FROM comments) AS comments,
        (SELECT count(*)::int FROM comment_votes) AS votes,
        (SELECT count(*)::int FROM user_follows) AS follows
    `;
    console.log(`[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s`, counts);
    console.log(`[seed] login: user1@example.test … user${USER_COUNT - 1}@example.test, admin@example.test — password "${PASSWORD}"`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
