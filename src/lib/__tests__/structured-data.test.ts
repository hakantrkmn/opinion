import { describe, expect, it } from "vitest";
import type { PinPageComment, PinPageData } from "@/server/services/pins/pages";
import { createJsonLdScript, generatePinDiscussionSchema, serializeJsonLd } from "../structured-data";

describe("serializeJsonLd", () => {
  it("cannot close the surrounding script tag", () => {
    const html = createJsonLdScript({ name: '</script><script>alert(1)</script>' }).__html;
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
  });

  it("stays valid JSON with the same value", () => {
    const value = { name: "a<b>&c ş ğ ı  " };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});

const pin: PinPageData = {
  id: "pin-1",
  name: "Barney Bar",
  lat: 41.0,
  lng: 29.0,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  updatedAt: new Date("2026-10-02T10:00:00Z"),
  commentsCount: 2,
  userId: "u1",
  displayName: "hakan",
  avatarUrl: null,
};

const comment = (over: Partial<PinPageComment>): PinPageComment => ({
  id: "c1",
  text: "Nice",
  createdAt: new Date("2026-10-01T10:00:00Z"),
  isFirstComment: false,
  verifiedVisit: false,
  photoUrl: null,
  userId: "u1",
  displayName: "hakan",
  avatarUrl: null,
  likeCount: 0,
  dislikeCount: 0,
  ...over,
});

describe("generatePinDiscussionSchema", () => {
  const config = { baseUrl: "https://dropinion.app", mapUrl: "/?pin=pin-1&lat=41&lng=29" };

  it("returns null without comments", () => {
    expect(generatePinDiscussionSchema(pin, [], config, "Anonymous")).toBeNull();
  });

  it("uses the opening opinion as the post and the rest as comments", () => {
    const schema = generatePinDiscussionSchema(
      pin,
      [
        comment({ id: "c2", text: "Reply", displayName: null, photoUrl: "/uploads/x.webp", likeCount: 3 }),
        comment({ id: "c1", text: "Opening", isFirstComment: true }),
      ],
      config,
      "Anonymous"
    )!;
    expect(schema["@type"]).toBe("DiscussionForumPosting");
    expect(schema.text).toBe("Opening");
    expect(schema.headline).toBe("Barney Bar");
    expect(schema.url).toBe("https://dropinion.app/pin/pin-1");
    const comments = schema.comment as Array<Record<string, unknown>>;
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe("Reply");
    expect(comments[0].image).toBe("https://dropinion.app/uploads/x.webp");
    expect(comments[0].author).toEqual({ "@type": "Person", name: "Anonymous" });
    expect(JSON.stringify(schema)).not.toContain("aggregateRating");
  });
});
