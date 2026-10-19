import type { Page } from "@playwright/test";
import { getComments, pickPin, type PinSummary } from "./support/api";
import { uniqueSuffix } from "./support/env";
import { expect, pinPanel, signInContext, test } from "./support/fixtures";

const countText = (n: number) => new RegExp(`^${n} ${n === 1 ? "comment" : "comments"}$`);
const isSeeded = (p: PinSummary) => !p.name.startsWith("E2E");

async function openPin(page: Page, pin: PinSummary) {
  await page.goto(`/?pin=${pin.id}&lat=${pin.lat}&lng=${pin.lng}`);
  const panel = pinPanel(page, pin.name);
  await expect(panel).toBeVisible({ timeout: 30_000 });
  // Comments loaded (skeletons gone).
  await expect(panel.getByLabel("Loading comments")).toHaveCount(0);
  return panel;
}

test.describe("comments", () => {
  test("post, edit and delete a comment", async ({ page, context, freshUser, errors }) => {
    const pin = await pickPin(freshUser.api, (p) => isSeeded(p) && p.comments_count >= 2);
    const before = (await getComments(freshUser.api, pin.id)).total;
    await signInContext(context, freshUser);

    const panel = await openPin(page, pin);
    await expect(panel.getByText(countText(before))).toBeVisible();

    // Post
    const text = `E2E comment ${uniqueSuffix()}`;
    const composer = panel.getByRole("textbox", { name: "Your comment" });
    await composer.fill(text);
    await panel.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Comment posted")).toBeVisible();
    const mine = panel.getByRole("article").filter({ hasText: text });
    await expect(mine).toBeVisible();
    await expect(panel.getByText(countText(before + 1))).toBeVisible();
    await expect(panel.getByText(/You.ve shared your opinion here/)).toBeVisible();
    await expect(composer).toHaveCount(0);

    const afterPost = await getComments(freshUser.api, pin.id);
    expect(afterPost.my_comment_id).not.toBeNull();
    const created = afterPost.comments.find((c) => c.id === afterPost.my_comment_id)!;
    expect(created.text).toBe(text);

    // Edit
    const edited = `${text} (edited)`;
    await mine.hover();
    await mine.getByRole("button", { name: "Edit comment" }).click();
    const editBox = panel.getByRole("textbox", { name: "Edit your comment" });
    await editBox.fill(edited);
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Comment updated")).toBeVisible();
    const mineEdited = panel.getByRole("article").filter({ hasText: edited });
    await expect(mineEdited).toBeVisible();
    // The "· edited" marker only shows for edits > 60 s after posting (by
    // design), so check the server timestamps instead.
    const afterEdit = (await getComments(freshUser.api, pin.id)).comments.find(
      (c) => c.id === created.id
    )!;
    expect(afterEdit.text).toBe(edited);
    expect(new Date(afterEdit.updated_at).getTime()).toBeGreaterThan(
      new Date(afterEdit.created_at).getTime()
    );

    // Delete
    await mineEdited.hover();
    await mineEdited.getByRole("button", { name: "Delete comment" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Delete this comment?" });
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Comment deleted")).toBeVisible();
    await expect(mineEdited).toHaveCount(0);
    await expect(panel.getByText(countText(before))).toBeVisible();
    await expect(panel.getByRole("textbox", { name: "Your comment" })).toBeVisible();
    expect((await getComments(freshUser.api, pin.id)).my_comment_id).toBeNull();
    expect(errors.messages).toEqual([]);
  });

  test("like a comment, then click again to remove the vote", async ({
    page,
    context,
    freshUser,
  }) => {
    // Single-comment pin: exactly one article, so the locator is stable.
    const pin = await pickPin(freshUser.api, (p) => isSeeded(p) && p.comments_count === 1);
    const [comment] = (await getComments(freshUser.api, pin.id)).comments;
    await signInContext(context, freshUser);

    const panel = await openPin(page, pin);
    const card = panel.getByRole("article");
    await expect(card).toHaveCount(1);

    const likes = comment.likes;
    const vote = () =>
      page.waitForResponse(
        (r) => r.url().endsWith(`/api/comments/${comment.id}/vote`) && r.request().method() === "PUT"
      );

    let response = vote();
    await card.getByRole("button", { name: `Like (${likes})`, exact: true }).click();
    expect((await response).status()).toBe(200);
    const liked = card.getByRole("button", { name: `Remove like (${likes + 1})`, exact: true });
    await expect(liked).toHaveAttribute("aria-pressed", "true");

    response = vote();
    await liked.click();
    expect((await response).status()).toBe(200);
    await expect(card.getByRole("button", { name: `Like (${likes})`, exact: true })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    const after = (await getComments(freshUser.api, pin.id)).comments[0];
    expect(after).toMatchObject({ id: comment.id, likes, my_vote: 0 });
  });
});
