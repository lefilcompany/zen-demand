// Sanity check: on Enterprise (no limits) the same actions do NOT show the
// plan-limit toast and resources can be created freely.

import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Happy path (Enterprise)", () => {
  test("creating a new board on Enterprise does NOT trigger the limit toast", async ({ page, seeded, loginAs }) => {
    const team = await seeded("enterprise"); // unlimited
    await loginAs(team);

    await page.goto("/boards");
    await expect(page.getByRole("heading", { name: /meus quadros/i })).toBeVisible({ timeout: 15_000 });
    const cta = page.getByRole("button", { name: /^novo quadro$/i });
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    // The create-board wizard should open, not the plans-limit toast.
    await expect(page.getByRole("dialog", { name: /criar novo quadro/i })).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText(/nome do quadro é obrigatório/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /ver planos/i })).toHaveCount(0);
    await expect(page.getByText(/permite até .* quadro/i)).toHaveCount(0);
  });

  test("creating a demand on Enterprise opens the create-demand dialog", async ({ page, seeded, loginAs }) => {
    const team = await seeded("enterprise");
    await loginAs(team);
    await page.goto("/");

    const cta = page.getByRole("button", { name: /nova demanda/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    // Dialog opens (some form field visible) and no limit toast.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/permite até .* demanda/i)).toHaveCount(0);
  });
});
