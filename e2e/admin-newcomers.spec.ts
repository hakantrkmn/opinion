import type { CommentResponse } from "../src/types/api";
import type { AdminNewcomersPage } from "../src/types/userTypes";
import { deleteComment, expectJson, newApi, pickPin, postComment } from "./support/api";
import { storageStatePath } from "./support/env";
import { expect, test } from "./support/fixtures";

test.describe("admin newcomers queue", () => {
  test("a new member's post waits until someone likes it", async ({ freshUser }) => {
    const admin = await newApi({ storageState: storageStatePath("admin") });
    const pin = await pickPin(freshUser.api);
    const posted = await expectJson<CommentResponse>(
      await postComment(freshUser.api, pin.id, "E2E newcomer hello"),
      201
    );
    try {
      const find = async () => {
        const page = await expectJson<AdminNewcomersPage>(
          await admin.get("/api/admin/newcomers", { params: { limit: "100" } }),
          200
        );
        return { page, post: page.items.find((p) => p.id === posted.comment.id) };
      };

      const before = await find();
      expect(before.post).toMatchObject({ answered: false, text: "E2E newcomer hello" });
      expect(before.post!.user).toMatchObject({ id: freshUser.id, total_comments: 1 });
      expect(before.page.waiting).toBeGreaterThanOrEqual(1);

      const vote = await admin.put(`/api/comments/${posted.comment.id}/vote`, { data: { value: 1 } });
      expect(vote.status()).toBe(200);
      const after = await find();
      // (No exact `waiting` check: parallel specs create newcomers too.)
      expect(after.post?.answered).toBe(true);

      // Regular members can't read the queue.
      await expectJson(await freshUser.api.get("/api/admin/newcomers"), 403);
    } finally {
      await deleteComment(freshUser.api, posted.comment.id);
      await admin.dispose();
    }
  });
});
