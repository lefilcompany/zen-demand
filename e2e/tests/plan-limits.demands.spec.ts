import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Demands (Starter monthly quota)", () => {
  test("blocks 'Nova Demanda' from topbar when monthly limit is reached", async ({ page, seeded, loginAs }) => {
    const team = await seeded("starter", "demands"); // 30 demands pre-created
    await loginAs(team);

    await page.goto("/");
    const cta = page.getByRole("button", { name: /nova demanda/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByText(/permite até 30 demanda/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
    // Create-demand modal must NOT have opened
    await expect(page.getByRole("dialog").filter({ hasText: /criar.*demanda|nova demanda/i })).toHaveCount(0);
  });
});
