import type { ApiError, CommentResponse } from "../src/types/api";
import type { UserPinsPage } from "../src/types/userTypes";
import {
  deleteComment,
  expectJson,
  getComments,
  newApi,
  pickPin,
  postComment,
} from "./support/api";
import { ISTANBUL, SEEDED, storageStatePath } from "./support/env";
import { expect, test } from "./support/fixtures";

/** Server-side rules, exercised directly over HTTP (no browser). */
test.describe("API rules", () => {
  test("POST /api/pins 5 km from the user's fix → 422 TOO_FAR", async ({ freshUser }) => {
    const res = await freshUser.api.post("/api/pins", {
      multipart: {
        name: "E2E too far",
        comment: "should never be created",
        lat: String(ISTANBUL.lat),
        lng: String(ISTANBUL.lng),
        user_lat: String(ISTANBUL.lat + 0.045), // ≈ 5 km north
        user_lng: String(ISTANBUL.lng),
        accuracy: "10",
      },
    });
    const body = await expectJson<ApiError>(res, 422);
    expect(body.code).toBe("TOO_FAR");
    const issues = body.issues as { distance_m: number; max_distance_m: number };
    expect(issues.distance_m).toBeGreaterThan(4500);
    expect(issues.distance_m).toBeLessThan(5500);
    expect(issues.max_distance_m).toBeLessThan(issues.distance_m);
  });

  test("a second comment on the same pin → 409 CONFLICT", async ({ freshUser }) => {
    const pin = await pickPin(freshUser.api);
    const first = await expectJson<CommentResponse>(
      await postComment(freshUser.api, pin.id, "E2E first comment"),
      201
    );
    try {
      const second = await expectJson<ApiError>(
        await postComment(freshUser.api, pin.id, "E2E second comment"),
        409
      );
      expect(second.code).toBe("CONFLICT");
    } finally {
      await deleteComment(freshUser.api, first.comment.id);
    }
  });

  test("commenting on a pin of a user who blocked you → 403", async () => {
    // user3 blocked user1 (seed). Look up a user3 pin as admin.
    const admin = await newApi({ storageState: storageStatePath("admin") });
    const user1 = await newApi({ storageState: storageStatePath("user1") });
    try {
      const page = await expectJson<UserPinsPage>(
        await admin.get(`/api/users/${SEEDED.user3.id}/pins`, { params: { limit: "1" } }),
        200
      );
      expect(page.items.length, "user3 owns pins in the seed").toBeGreaterThan(0);
      const res = await postComment(user1, page.items[0].id, "E2E should be blocked");
      const body = await expectJson<ApiError>(res, 403);
      expect(body.code).toBe("FORBIDDEN");
    } finally {
      await admin.dispose();
      await user1.dispose();
    }
  });

  test("unauthenticated mutations → 401", async ({ anonApi }) => {
    const pin = await pickPin(anonApi);
    const comment = await expectJson<ApiError>(await postComment(anonApi, pin.id, "anon"), 401);
    expect(comment.code).toBe("UNAUTHORIZED");

    const pinRes = await anonApi.post("/api/pins", {
      multipart: { name: "x", comment: "y", lat: "41", lng: "29", user_lat: "41", user_lng: "29", accuracy: "5" },
    });
    expect((await expectJson<ApiError>(pinRes, 401)).code).toBe("UNAUTHORIZED");

    const follow = await anonApi.post(`/api/users/${SEEDED.user5.id}/follow`);
    expect((await expectJson<ApiError>(follow, 401)).code).toBe("UNAUTHORIZED");
  });

  test("cookie-authenticated mutation from a foreign Origin → 403", async ({ anonApi }) => {
    const pin = await pickPin(anonApi);
    const [comment] = (await getComments(anonApi, pin.id)).comments;
    const foreign = await newApi({
      storageState: storageStatePath("user1"),
      headers: { Origin: "https://evil.example" },
    });
    const sameOrigin = await newApi({ storageState: storageStatePath("user1") });
    try {
      // Harmless if it ever got through: value 0 just clears a vote.
      const res = await foreign.put(`/api/comments/${comment.id}/vote`, { data: { value: 0 } });
      const body = await expectJson<ApiError>(res, 403);
      expect(body).toMatchObject({ code: "FORBIDDEN", message: "Invalid origin" });

      // Sanity: the same cookies are a valid session.
      expect((await sameOrigin.get("/api/profile")).status()).toBe(200);
    } finally {
      await foreign.dispose();
      await sameOrigin.dispose();
    }
  });

  test("uploading an SVG → 422", async ({ freshUser }) => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script><rect width="10" height="10"/></svg>'
    );
    // Declared as SVG, and disguised as a PNG: the server sniffs the bytes.
    for (const file of [
      { name: "evil.svg", mimeType: "image/svg+xml", buffer: svg },
      { name: "evil.png", mimeType: "image/png", buffer: svg },
    ]) {
      const res = await freshUser.api.post("/api/upload", {
        multipart: { type: "comment-photo", file },
      });
      const body = await expectJson<ApiError>(res, 422);
      expect(body.code).toBe("VALIDATION_ERROR");
    }
  });

  test("path traversal under /uploads is rejected", async ({ anonApi }) => {
    for (const path of ["/uploads/..%2f..%2f.env", "/uploads/..%2F..%2Fpackage.json", "/uploads/%2e%2e/%2e%2e/.env"]) {
      const res = await anonApi.get(path, { maxRedirects: 0 });
      expect([400, 404], `${path} → ${res.status()}`).toContain(res.status());
      const text = await res.text();
      expect(text).not.toContain("DATABASE_URL");
      expect(text).not.toContain('"dependencies"');
    }
  });
});
