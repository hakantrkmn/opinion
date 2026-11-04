import type { Paginated, UserSummary } from "../src/types/api";
import { expectJson, newApi } from "./support/api";
import { storageStatePath } from "./support/env";
import { expect, test } from "./support/fixtures";

/** Search ignores case, accents and Turkish dotted / dotless i. */
test.describe("Turkish-aware search", () => {
  test("people search: 'aydin' and 'AYDIN' find 'Aydın'", async () => {
    const api = await newApi({ storageState: storageStatePath("user1") });
    try {
      for (const q of ["aydin", "AYDIN", "Aydın"]) {
        const body = await expectJson<Paginated<UserSummary>>(
          await api.get("/api/users/search", { params: { q } }),
          200
        );
        expect(body.items.map((u) => u.display_name), q).toContain("Burak Aydın");
      }
    } finally {
      await api.dispose();
    }
  });

  test("location page: /location/kadikoy lists 'Kadıköy' pins", async ({ page }) => {
    await page.goto("/location/kadikoy");
    await expect(page.getByText(/Kadıköy/).first()).toBeVisible();
  });
});
