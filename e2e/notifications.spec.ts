import type { APIRequestContext } from "@playwright/test";
import type {
  CommentResponse,
  NotificationItem,
  Paginated,
  UnreadNotificationsResponse,
} from "../src/types/api";
import { createPin, deleteComment, expectJson, postComment, signUpUser, type TestUser } from "./support/api";
import { ISTANBUL } from "./support/env";
import { expect, test } from "./support/fixtures";

/** Inbox rows are written in `after()`, so poll for them. */
async function inbox(api: APIRequestContext) {
  return expectJson<Paginated<NotificationItem>>(await api.get("/api/notifications"), 200);
}

async function unread(api: APIRequestContext) {
  const body = await expectJson<UnreadNotificationsResponse>(
    await api.get("/api/notifications/unread-count"),
    200
  );
  return body.unread_count;
}

function rowsFor(items: NotificationItem[], type: NotificationItem["type"], pinId?: string) {
  return items.filter((n) => n.type === type && (!pinId || n.pin?.id === pinId));
}

test.describe("Notification inbox", () => {
  test.describe.configure({ mode: "serial" });

  let owner: TestUser;
  let alice: TestUser;
  let bob: TestUser;
  let pinId: string;
  let ownerCommentId: string;
  const comments: Array<{ api: APIRequestContext; id: string }> = [];
  const extraUsers: TestUser[] = [];

  test.beforeAll(async () => {
    [owner, alice, bob] = await Promise.all([signUpUser(), signUpUser(), signUpUser()]);
    const at = { lat: ISTANBUL.lat + Math.random() * 0.004, lng: ISTANBUL.lng + Math.random() * 0.004 };
    const created = await createPin(owner.api, { name: "E2E inbox pin", comment: "Owner's take", at });
    pinId = created.pin.id;
    ownerCommentId = created.comment.id;
    comments.push({ api: owner.api, id: ownerCommentId });
  });

  test.afterAll(async () => {
    for (const c of comments.reverse()) await deleteComment(c.api, c.id);
    await Promise.all([owner, alice, bob, ...extraUsers].map((u) => u?.api.dispose()));
  });

  test("requires a session", async ({ anonApi }) => {
    await expectJson(await anonApi.get("/api/notifications"), 401);
    await expectJson(await anonApi.get("/api/notifications/unread-count"), 401);
    await expectJson(await anonApi.post("/api/notifications/read", { data: { all: true } }), 401);
  });

  test("opinions on a pin are grouped for the owner and reach earlier commenters", async () => {
    const a = await expectJson<CommentResponse>(await postComment(alice.api, pinId, "Alice agrees"), 201);
    comments.push({ api: alice.api, id: a.comment.id });

    await expect.poll(async () => rowsFor((await inbox(owner.api)).items, "pin_commented", pinId).length).toBe(1);

    const b = await expectJson<CommentResponse>(await postComment(bob.api, pinId, "Bob disagrees"), 201);
    comments.push({ api: bob.api, id: b.comment.id });

    await expect
      .poll(async () => rowsFor((await inbox(owner.api)).items, "pin_commented", pinId)[0]?.count)
      .toBe(2);
    const [ownerRow] = rowsFor((await inbox(owner.api)).items, "pin_commented", pinId);
    expect(ownerRow.read).toBe(false);
    expect(ownerRow.actor.id).toBe(bob.id);
    expect(ownerRow.pin?.is_mine).toBe(true);
    expect(ownerRow.comment?.text).toBe("Bob disagrees");
    expect(await unread(owner.api)).toBe(1);

    // Alice commented before Bob → she hears about Bob, not about herself.
    await expect.poll(async () => rowsFor((await inbox(alice.api)).items, "pin_commented", pinId).length).toBe(1);
    const [aliceRow] = rowsFor((await inbox(alice.api)).items, "pin_commented", pinId);
    expect(aliceRow.actor.id).toBe(bob.id);
    expect(aliceRow.count).toBe(1);
    expect(aliceRow.pin?.is_mine).toBe(false);

    // Bob is the latest commenter: nothing for him.
    expect(rowsFor((await inbox(bob.api)).items, "pin_commented", pinId)).toHaveLength(0);
  });

  test("marking read clears the badge; the next event starts a new row", async () => {
    const before = rowsFor((await inbox(owner.api)).items, "pin_commented", pinId);
    const marked = await expectJson<UnreadNotificationsResponse>(
      await owner.api.post("/api/notifications/read", { data: { ids: before.map((n) => n.id) } }),
      200
    );
    expect(marked.unread_count).toBe(0);
    const after = rowsFor((await inbox(owner.api)).items, "pin_commented", pinId);
    expect(after.every((n) => n.read)).toBe(true);

    // Someone else's ids are ignored.
    const [aliceRow] = rowsFor((await inbox(alice.api)).items, "pin_commented", pinId);
    await expectJson(
      await owner.api.post("/api/notifications/read", { data: { ids: [aliceRow.id] } }),
      200
    );
    expect(await unread(alice.api)).toBeGreaterThanOrEqual(1);

    const carol = await signUpUser();
    extraUsers.push(carol);
    const c = await expectJson<CommentResponse>(await postComment(carol.api, pinId, "Carol's view"), 201);
    comments.push({ api: carol.api, id: c.comment.id });
    await expect.poll(() => unread(owner.api)).toBe(1);
    const rows = rowsFor((await inbox(owner.api)).items, "pin_commented", pinId);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ read: false, count: 1 });
    expect(rows[0].actor.id).toBe(carol.id);
  });

  test("likes and follows land in the inbox", async () => {
    const vote = await alice.api.put(`/api/comments/${ownerCommentId}/vote`, { data: { value: 1 } });
    expect(vote.status()).toBe(200);
    await expectJson(await bob.api.post(`/api/users/${owner.id}/follow`), 200);

    await expect.poll(async () => rowsFor((await inbox(owner.api)).items, "comment_liked").length).toBe(1);
    const [liked] = rowsFor((await inbox(owner.api)).items, "comment_liked");
    expect(liked.actor.id).toBe(alice.id);
    expect(liked.comment?.id).toBe(ownerCommentId);
    expect(liked.pin?.id).toBe(pinId);

    await expect.poll(async () => rowsFor((await inbox(owner.api)).items, "followed").length).toBe(1);
    expect(rowsFor((await inbox(owner.api)).items, "followed")[0].actor.id).toBe(bob.id);
  });

  test("rows from a blocked user disappear", async () => {
    const countBefore = await unread(owner.api);
    const bobRows = (await inbox(owner.api)).items.filter((n) => n.actor.id === bob.id && !n.read);
    expect(bobRows.length).toBeGreaterThan(0);

    const block = await owner.api.post(`/api/users/${bob.id}/block`);
    expect([200, 201, 204]).toContain(block.status());
    try {
      const items = (await inbox(owner.api)).items;
      expect(items.some((n) => n.actor.id === bob.id)).toBe(false);
      expect(await unread(owner.api)).toBe(countBefore - bobRows.length);
    } finally {
      await owner.api.delete(`/api/users/${bob.id}/block`);
    }
  });

  test("repeat follows by one person count once", async () => {
    const dave = await signUpUser();
    extraUsers.push(dave);
    for (let i = 0; i < 3; i++) {
      await expectJson(await dave.api.post(`/api/users/${alice.id}/follow`), 200);
      if (i < 2) await expectJson(await dave.api.delete(`/api/users/${alice.id}/follow`), 200);
    }
    await expect
      .poll(async () => rowsFor((await inbox(alice.api)).items, "followed")[0]?.actor.id)
      .toBe(dave.id);
    const [row] = rowsFor((await inbox(alice.api)).items, "followed");
    expect(row.count).toBe(1);
  });

  test("a row bumped after the client saw it stays unread (seen_until)", async () => {
    await expectJson(await owner.api.post("/api/notifications/read", { data: { all: true } }), 200);
    const erin = await signUpUser();
    const frank = await signUpUser();
    extraUsers.push(erin, frank);
    const e = await expectJson<CommentResponse>(await postComment(erin.api, pinId, "Erin was here"), 201);
    comments.push({ api: erin.api, id: e.comment.id });
    await expect.poll(() => unread(owner.api)).toBe(1);
    const [seen] = rowsFor((await inbox(owner.api)).items, "pin_commented", pinId).filter((n) => !n.read);

    // Frank's opinion lands on the same unread row before the client marks it.
    const f = await expectJson<CommentResponse>(await postComment(frank.api, pinId, "Frank too"), 201);
    comments.push({ api: frank.api, id: f.comment.id });
    await expect
      .poll(async () => rowsFor((await inbox(owner.api)).items, "pin_commented", pinId)[0]?.count)
      .toBe(2);

    const res = await expectJson<UnreadNotificationsResponse>(
      await owner.api.post("/api/notifications/read", {
        data: { ids: [seen.id], seen_until: seen.updated_at },
      }),
      200
    );
    expect(res.unread_count).toBe(1);
    await expectJson(
      await owner.api.post("/api/notifications/read", { data: { ids: [seen.id] } }),
      200
    );
    expect(await unread(owner.api)).toBe(0);
  });

  test("pins of a blocked owner are hidden from earlier commenters", async () => {
    // Alice commented on owner's pin; owner then blocks Alice.
    const block = await owner.api.post(`/api/users/${alice.id}/block`);
    expect(block.status()).toBe(200);
    try {
      const items = (await inbox(alice.api)).items;
      expect(rowsFor(items, "pin_commented", pinId)).toHaveLength(0);

      // New opinions on that pin don't reach her either.
      const gina = await signUpUser();
      extraUsers.push(gina);
      const g = await expectJson<CommentResponse>(await postComment(gina.api, pinId, "Gina's take"), 201);
      comments.push({ api: gina.api, id: g.comment.id });
      await expect.poll(async () => rowsFor((await inbox(owner.api)).items, "pin_commented", pinId)[0]?.actor.id).toBe(gina.id);
      const raw = await expectJson<Paginated<NotificationItem>>(await alice.api.get("/api/notifications"), 200);
      expect(raw.items.some((n) => n.pin?.id === pinId)).toBe(false);
    } finally {
      await owner.api.delete(`/api/users/${alice.id}/block`);
    }
  });

  test("a deleted account leaves the group, other actors stay", async () => {
    const [target, stays, leaves] = await Promise.all([signUpUser(), signUpUser(), signUpUser()]);
    extraUsers.push(target, stays, leaves);
    await expectJson(await stays.api.post(`/api/users/${target.id}/follow`), 200);
    await expectJson(await leaves.api.post(`/api/users/${target.id}/follow`), 200);
    await expect.poll(async () => rowsFor((await inbox(target.api)).items, "followed")[0]?.count).toBe(2);

    const del = await leaves.api.delete("/api/profile/account", { data: { password: leaves.password } });
    expect(del.status()).toBe(204);

    const [row] = rowsFor((await inbox(target.api)).items, "followed");
    expect(row).toMatchObject({ count: 1, read: false });
    expect(row.actor.id).toBe(stays.id);
  });
});
