import type {
  ApiError,
  CommunityInvitePreview,
  CommunityListResponse,
  CommunityMember,
  CommunityResponse,
  NotificationItem,
  Paginated,
  PinsInBoundsResponse,
} from "../src/types/api";
import {
  bboxAround,
  createPin,
  deleteComment,
  expectJson,
  getComments,
  postComment,
  signUpUser,
  type TestUser,
} from "./support/api";
import { expect, signInContext, test } from "./support/fixtures";

/** A spot away from the seeded Istanbul pins so filters are easy to assert. */
function quietSpot() {
  return { lat: 39.9 + Math.random() * 0.5, lng: 32.6 + Math.random() * 0.5 };
}

async function createCommunity(user: TestUser, name = "E2E community") {
  const res = await user.api.post("/api/communities", { data: { name, description: "e2e" } });
  return (await expectJson<CommunityResponse>(res, 201)).community;
}

async function join(user: TestUser, code: string) {
  return user.api.post(`/api/communities/invites/${code}`);
}

test.describe("Communities API", () => {
  test("founder creates, a member joins by link, filters apply", async ({ freshUser: founder }) => {
    const member = await signUpUser();
    const outsider = await signUpUser();
    try {
      const community = await createCommunity(founder);
      expect(community.is_owner).toBe(true);
      expect(community.members_count).toBe(1);
      expect(community.invite_code).toBeTruthy();
      const code = community.invite_code!;

      // Anyone with the link sees the preview; nobody else sees the community.
      const preview = await expectJson<CommunityInvitePreview>(
        await outsider.api.get(`/api/communities/invites/${code}`),
        200
      );
      expect(preview.community.name).toBe("E2E community");
      expect(preview.is_member).toBe(false);
      await expectJson<ApiError>(await outsider.api.get(`/api/communities/${community.id}`), 404);

      const joined = await expectJson<CommunityResponse>(await join(member, code), 200);
      expect(joined.community.is_owner).toBe(false);
      expect(joined.community.invite_code).toBeNull();
      expect(joined.community.members_count).toBe(2);
      // Idempotent.
      await expectJson<CommunityResponse>(await join(member, code), 200);

      const mine = await expectJson<CommunityListResponse>(await member.api.get("/api/communities"), 200);
      expect(mine.items.map((c) => c.id)).toContain(community.id);

      // The founder gets a "joined" notification.
      const inbox = await expectJson<Paginated<NotificationItem>>(
        await founder.api.get("/api/notifications"),
        200
      );
      const note = inbox.items.find((n) => n.type === "community_joined");
      expect(note?.community).toEqual({ id: community.id, name: "E2E community" });
      expect(note?.actor.id).toBe(member.id);

      // Map: a pin by the member and one by an outsider; community scope shows only the first.
      const at = quietSpot();
      const memberPin = await createPin(member.api, { name: "E2E member pin", comment: "member", at });
      const outsiderPin = await createPin(outsider.api, {
        name: "E2E outsider pin",
        comment: "outsider",
        at: { lat: at.lat + 0.001, lng: at.lng },
      });
      // The outsider also comments on the member's pin.
      const outsiderComment = await expectJson<{ comment: { id: string } }>(
        await postComment(outsider.api, memberPin.pin.id, "outsider on member pin"),
        201
      );

      const params = { ...bboxAround(at.lat, at.lng, 0.01), scope: "community", community_id: community.id };
      const scoped = await expectJson<PinsInBoundsResponse>(
        await founder.api.get("/api/pins", { params }),
        200
      );
      const ids = scoped.pins.map((p) => p.id);
      expect(ids).toContain(memberPin.pin.id);
      expect(ids).not.toContain(outsiderPin.pin.id);

      // Non-members can't use the scope.
      await expectJson<ApiError>(await outsider.api.get("/api/pins", { params }), 404);
      await expectJson<ApiError>(
        await founder.api.get("/api/pins", { params: { ...params, community_id: undefined } as never }),
        400
      );

      // Comments: the community filter keeps only members' opinions.
      const all = await getComments(founder.api, memberPin.pin.id);
      expect(all.total).toBe(2);
      const filtered = await expectJson<{ total: number; comments: Array<{ user: { id: string } }> }>(
        await founder.api.get(`/api/pins/${memberPin.pin.id}/comments`, {
          params: { community_id: community.id },
        }),
        200
      );
      expect(filtered.total).toBe(1);
      expect(filtered.comments.map((c) => c.user.id)).toEqual([member.id]);
      await expectJson<ApiError>(
        await outsider.api.get(`/api/pins/${memberPin.pin.id}/comments`, {
          params: { community_id: community.id },
        }),
        404
      );

      await deleteComment(outsider.api, outsiderComment.comment.id);
      await deleteComment(outsider.api, outsiderPin.comment.id);
      await deleteComment(member.api, memberPin.comment.id);
    } finally {
      await member.api.dispose();
      await outsider.api.dispose();
    }
  });

  test("only the founder manages; removed members cannot rejoin", async ({ freshUser: founder }) => {
    const member = await signUpUser();
    try {
      const community = await createCommunity(founder, "E2E managed");
      await expectJson<CommunityResponse>(await join(member, community.invite_code!), 200);

      // Members can't edit, reset the link, remove others or delete.
      await expectJson<ApiError>(
        await member.api.patch(`/api/communities/${community.id}`, { data: { name: "x" } }),
        403
      );
      await expectJson<ApiError>(await member.api.post(`/api/communities/${community.id}/invite`), 403);
      await expectJson<ApiError>(
        await member.api.delete(`/api/communities/${community.id}/members/${founder.id}`),
        403
      );
      await expectJson<ApiError>(await member.api.delete(`/api/communities/${community.id}`), 403);

      // The founder can't leave.
      await expectJson<ApiError>(
        await founder.api.delete(`/api/communities/${community.id}/members/${founder.id}`),
        400
      );

      const members = await expectJson<Paginated<CommunityMember>>(
        await founder.api.get(`/api/communities/${community.id}/members`),
        200
      );
      expect(members.items[0].is_owner).toBe(true);
      expect(members.items.map((m) => m.user.id)).toEqual([founder.id, member.id]);

      // Remove → can't rejoin by link.
      expect((await founder.api.delete(`/api/communities/${community.id}/members/${member.id}`)).status()).toBe(204);
      const rejoin = await expectJson<ApiError>(await join(member, community.invite_code!), 403);
      expect(rejoin.issues).toEqual({ reason: "removed" });

      // Reset link: the old code stops working.
      const reset = await expectJson<{ invite_code: string }>(
        await founder.api.post(`/api/communities/${community.id}/invite`),
        200
      );
      expect(reset.invite_code).not.toBe(community.invite_code);
      await expectJson<ApiError>(await founder.api.get(`/api/communities/invites/${community.invite_code}`), 404);

      // Rename, then delete.
      const renamed = await expectJson<CommunityResponse>(
        await founder.api.patch(`/api/communities/${community.id}`, {
          data: { name: "E2E renamed", description: null },
        }),
        200
      );
      expect(renamed.community.name).toBe("E2E renamed");
      expect(renamed.community.description).toBeNull();
      expect((await founder.api.delete(`/api/communities/${community.id}`)).status()).toBe(204);
      await expectJson<ApiError>(await founder.api.get(`/api/communities/${community.id}`), 404);
    } finally {
      await member.api.dispose();
    }
  });

  test("a member can leave; the per-user limit applies", async ({ freshUser: founder }) => {
    const member = await signUpUser();
    try {
      const community = await createCommunity(founder, "E2E leave");
      await expectJson<CommunityResponse>(await join(member, community.invite_code!), 200);
      expect((await member.api.delete(`/api/communities/${community.id}/members/${member.id}`)).status()).toBe(204);
      await expectJson<ApiError>(await member.api.get(`/api/communities/${community.id}`), 404);
      // Leaving is not a removal: the link still works.
      await expectJson<CommunityResponse>(await join(member, community.invite_code!), 200);

      // Fill up to the limit (10 in total), then the next create is refused.
      for (let i = 0; i < 9; i++) await createCommunity(member, `E2E limit ${i}`);
      const over = await expectJson<ApiError>(
        await member.api.post("/api/communities", { data: { name: "one too many" } }),
        409
      );
      expect(over.issues).toEqual({ reason: "limit" });
    } finally {
      await member.api.dispose();
    }
  });

  test("concurrent requests can't pass the per-user limit", async ({ freshUser: user }) => {
    for (let i = 0; i < 9; i++) await createCommunity(user, `E2E race ${i}`);
    const results = await Promise.all(
      [0, 1, 2].map((i) => user.api.post("/api/communities", { data: { name: `E2E race last ${i}` } }))
    );
    expect(results.map((r) => r.status()).sort()).toEqual([201, 409, 409]);
    const mine = await expectJson<CommunityListResponse>(await user.api.get("/api/communities"), 200);
    expect(mine.items).toHaveLength(10);
  });

  test("anonymous and invalid requests", async ({ anonApi }) => {
    expect((await anonApi.get("/api/communities")).status()).toBe(401);
    expect((await anonApi.post("/api/communities/invites/abcdefgh")).status()).toBe(401);
    expect((await anonApi.get("/api/communities/invites/doesnotexist")).status()).toBe(404);
    expect((await anonApi.get("/api/communities/invites/x")).status()).toBe(400);
  });
});

test.describe("Communities UI", () => {
  test("create, invite, join and filter the map", async ({ page, context, browser, freshUser: founder }) => {
    await signInContext(context, founder);
    await page.goto("/communities");
    await expect(page.getByRole("heading", { level: 1, name: "Communities" })).toBeVisible();
    await expect(page.getByText("No communities yet")).toBeVisible();

    await page.getByRole("button", { name: "Create a community" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("E2E UI crew");
    await page.getByRole("textbox", { name: /Description/ }).fill("Made by the UI test");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page).toHaveURL(/\/communities\/[\w-]+$/);
    const id = page.url().split("/").pop()!;
    await expect(page.getByRole("heading", { level: 1, name: "E2E UI crew" })).toBeVisible();
    const link = await page.getByRole("textbox", { name: "Invite link" }).inputValue();
    expect(link).toMatch(/\/c\/[\w-]+$/);

    // A second person opens the link and joins.
    const member = await signUpUser();
    const memberContext = await browser.newContext();
    try {
      await signInContext(memberContext, member);
      const memberPage = await memberContext.newPage();
      await memberPage.goto(new URL(link).pathname);
      await expect(memberPage.getByRole("heading", { level: 1, name: "E2E UI crew" })).toBeVisible();
      await memberPage.getByRole("button", { name: "Join community" }).click();
      await expect(memberPage).toHaveURL(new RegExp(`/communities/${id}$`));
      await expect(memberPage.getByText("2 members").first()).toBeVisible();
    } finally {
      await memberContext.close();
      await member.api.dispose();
    }

    // The founder sees the new member and can filter the map by the community.
    await page.reload();
    await expect(page.getByRole("button", { name: `Remove ${member.name}` })).toBeVisible();
    await page.getByRole("link", { name: "Show on map" }).click();
    await expect(page).toHaveURL(new RegExp(`scope=community&community=${id}`));
    const picker = page.getByRole("button", { name: /E2E UI crew/ });
    await expect(picker).toBeVisible();
    await picker.click();
    await expect(page.getByRole("menuitemradio", { name: /E2E UI crew/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("an unknown invite link explains itself", async ({ page }) => {
    await page.goto("/c/notarealcode");
    await expect(page.getByRole("heading", { name: "This invite link doesn't work" })).toBeVisible();
  });
});
