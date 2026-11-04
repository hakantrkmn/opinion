import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, negotiateLocale, resolveLocale } from "../config";
import { NAMESPACES } from "../messages";

const MESSAGES_DIR = join(__dirname, "../../../messages");

function load(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, locale, `${ns}.json`), "utf8"));
}

/** Flattened "a.b.c" keys of a messages object. */
function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

/**
 * ICU argument names ({name}, {count, plural, …}) and rich-text tags
 * (<b>…</b>) of a message. Argument braces sit at odd nesting depths;
 * plural / select branch bodies ({…}) at even ones and are not arguments.
 */
function placeholders(message: string): string[] {
  const found = new Set<string>();
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    const ch = message[i];
    if (ch === "'") {
      // ICU quoting: '{' is a literal brace.
      const end = message.indexOf("'", i + 1);
      if (end > i + 1) i = end;
      continue;
    }
    if (ch === "{") {
      depth++;
      if (depth % 2 === 1) {
        const name = /^\s*([a-zA-Z0-9_]+)/.exec(message.slice(i + 1));
        if (name) found.add(name[1]);
      }
    } else if (ch === "}") {
      depth--;
    }
  }
  for (const tag of message.matchAll(/<([a-zA-Z0-9_]+)>/g)) found.add(`<${tag[1]}>`);
  return [...found].sort();
}

describe("messages", () => {
  it("has a file for every namespace in every locale, and nothing else", () => {
    for (const locale of LOCALES) {
      const files = readdirSync(join(MESSAGES_DIR, locale)).filter((f) => f.endsWith(".json"));
      expect(files.map((f) => f.replace(/\.json$/, "")).sort(), locale).toEqual([...NAMESPACES].sort());
    }
  });

  for (const ns of NAMESPACES) {
    it(`${ns}: every locale has the same keys and placeholders as English`, () => {
      const en = load("en", ns);
      const enKeys = keys(en).sort();
      for (const locale of LOCALES.filter((l) => l !== "en")) {
        const other = load(locale, ns);
        expect(keys(other).sort(), `${locale}/${ns}.json keys`).toEqual(enKeys);
        for (const key of enKeys) {
          const get = (o: Record<string, unknown>) =>
            key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], o);
          const a = get(en);
          const b = get(other);
          expect(typeof b, `${locale}/${ns}.json ${key}`).toBe("string");
          expect(placeholders(b as string), `${locale}/${ns}.json ${key} placeholders`).toEqual(
            placeholders(a as string)
          );
        }
      }
    });
  }
});

describe("locale negotiation", () => {
  it("prefers a supported language by q-value", () => {
    expect(negotiateLocale("tr-TR,tr;q=0.9,en-US;q=0.8")).toBe("tr");
    expect(negotiateLocale("de-DE,en;q=0.5,tr;q=0.7")).toBe("tr");
    expect(negotiateLocale("de-DE")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
  it("lets a valid cookie win", () => {
    expect(resolveLocale({ cookie: "tr", acceptLanguage: "en" })).toBe("tr");
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "tr" })).toBe("tr");
  });
});
