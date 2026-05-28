import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Boards (Starter)", () => {
  test("blocks 'Novo Quadro' click when already at 1 board", async ({ page, seeded, loginAs }) => {
    const team = await seeded("starter", "boards"); // 1 board pre-created
    await loginAs(team);

    await page.goto("/boards");
    // The page may render either a header "Novo Quadro" button or a CTA elsewhere.
    const cta = page.getByRole("button", { name: /novo quadro/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    // Limit toast appears; wizard does NOT mount.
    await expect(page.getByText(/limite|quadro/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/permite até 1 quadro/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
    // Wizard title should NOT be present
    await expect(page.getByText(/criar novo quadro/i)).toHaveCount(0);
  });
});
