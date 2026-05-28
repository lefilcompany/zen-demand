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

    // Trigger the create-board dialog. The visible text "Novo Quadro" is hidden on small
    // viewports, so we fall back to the empty-state CTA if needed.
    const cta = page
      .getByRole("button", { name: /novo quadro|criar primeiro quadro/i })
      .first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    // The wizard mounts. We assert on the DialogDescription text (unique) instead of the
    // accessible-name of the dialog, which can be flaky during Radix hydration in CI.
    await expect(page.getByText(/configure o quadro em etapas/i)).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toHaveCount(0);
    await expect(page.getByText(/permite até .* quadro/i)).toHaveCount(0);
  });

  test("creating a demand on Enterprise opens the create-demand dialog", async ({ page, seeded, loginAs }) => {
    const team = await seeded("enterprise");
    await loginAs(team);
    await page.goto("/", { waitUntil: "networkidle" });

    const cta = page.getByRole("button", { name: /nova demanda/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/permite até .* demanda/i)).toHaveCount(0);
  });
});
