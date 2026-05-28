// Sanity check: on Enterprise (no limits) the same actions do NOT show the
// plan-limit toast and resources can be created freely.

import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Happy path (Enterprise)", () => {
  test("creating a new board on Enterprise does NOT trigger the limit toast", async ({ page, seeded, loginAs }) => {
    const team = await seeded("enterprise"); // unlimited
    await loginAs(team);

    await page.goto("/boards", { waitUntil: "networkidle" });

    // Wait until the boards page has rendered AND the seeded default board is in the list.
    await expect(page.getByRole("heading", { name: /meus quadros/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/quadro padrão/i).first()).toBeVisible({ timeout: 20_000 });

    const cta = page
      .getByRole("button", { name: /novo quadro|criar primeiro quadro/i })
      .first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    // Use force-click to bypass any transient overlays (onboarding/portal animations).
    await cta.click({ force: true });

    // The wizard mounts — assert on the dialog title (always rendered, even if sr-only).
    await expect(page.getByRole("heading", { name: /criar novo quadro/i })).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toHaveCount(0);
    await expect(page.getByText(/permite até .* quadro/i)).toHaveCount(0);
  });

  test("creating a demand on Enterprise opens the create-demand dialog", async ({ page, seeded, loginAs }) => {
    const team = await seeded("enterprise");
    await loginAs(team);
    await page.goto("/", { waitUntil: "networkidle" });

    const cta = page.getByRole("button", { name: /nova demanda/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    // Force-click to bypass any onboarding/portal overlay that might still be animating in.
    await cta.click({ force: true });

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/permite até .* demanda/i)).toHaveCount(0);
  });
});
