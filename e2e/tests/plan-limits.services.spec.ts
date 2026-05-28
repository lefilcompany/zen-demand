import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Services (Starter)", () => {
  test("blocks 'Novo Serviço' when service quota is full", async ({ page, seeded, loginAs }) => {
    const team = await seeded("starter", "services"); // 5 services pre-created
    await loginAs(team);

    await page.goto(`/teams/${team.teamId}/services`);
    const cta = page.getByRole("button", { name: /novo serviço|adicionar serviço/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByText(/permite até 5 serviço/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
  });
});
