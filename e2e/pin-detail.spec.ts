import { getComments, pickPin } from "./support/api";
import { escapeRegExp, expect, pinPanel, test } from "./support/fixtures";

test.describe("pin deep link", () => {
  test("/?pin=<id> opens the detail panel; closing strips the URL params", async ({
    page,
    anonApi,
    errors,
  }) => {
    const pin = await pickPin(anonApi, (p) => p.comments_count >= 2);
    const { comments, total } = await getComments(anonApi, pin.id);

    await page.goto(`/?pin=${pin.id}&lat=${pin.lat}&lng=${pin.lng}`);

    const panel = pinPanel(page, pin.name);
    await expect(panel).toBeVisible();
    // Panel header: author line (the dialog's accessible name is the pin name).
    await expect(panel.getByText(`by ${pin.user.display_name}`)).toBeVisible();
    await expect(panel.getByText(new RegExp(`^${total} comments$`))).toBeVisible();
    await expect(panel.getByRole("article")).toHaveCount(Math.min(total, 30)); // COMMENTS_PAGE_SIZE
    await expect(panel.getByText(comments[0].text).first()).toBeVisible();
    // Anonymous composer → sign-in call to action.
    await expect(panel.getByText("Sign in to share your droPINion")).toBeVisible();

    await panel.getByRole("button", { name: "Close" }).click();
    await expect(panel).toBeHidden();
    await expect(page).not.toHaveURL(/[?&](pin|lat|lng)=/);
    expect(errors.messages).toEqual([]);
  });

  test("/?pin=<id> without coordinates fetches the pin and opens it", async ({ page, anonApi }) => {
    const pin = await pickPin(anonApi);
    const pinRequest = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/pins/${pin.id}` && r.status() === 200
    );
    await page.goto(`/?pin=${pin.id}`);
    await pinRequest;
    await expect(pinPanel(page, pin.name)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(pinPanel(page, pin.name)).toBeHidden();
    await expect(page).not.toHaveURL(/pin=/);
  });

  test("an unknown pin id shows the not-found state", async ({ page }) => {
    await page.goto("/?pin=does-not-exist-e2e");
    const panel = page.getByRole("dialog", { name: "Pin not found" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("This pin no longer exists")).toBeVisible();
    await panel.getByRole("button", { name: "Back to the map" }).click();
    await expect(panel).toBeHidden();
    await expect(page).not.toHaveURL(new RegExp(escapeRegExp("pin=")));
  });
});
