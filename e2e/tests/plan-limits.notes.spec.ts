import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Notes", () => {
  test("Starter (max_notes=0): blocks 'Nova Nota' immediately", async ({ page, seeded, loginAs }) => {
    const team = await seeded("starter"); // notes not allowed at all on starter
    await loginAs(team);

    await page.goto("/notes");
    const cta = page.getByRole("button", { name: /nova nota|criar nota/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByText(/não inclui notas|permite até 0 nota/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
  });

  test("Profissional (max_notes=10): blocks 'Nova Nota' when 10 already exist", async ({ page, seeded, loginAs }) => {
    const team = await seeded("profissional", "notes");
    await loginAs(team);

    await page.goto("/notes");
    const cta = page.getByRole("button", { name: /nova nota|criar nota/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByText(/permite até 10 nota/i)).toBeVisible({ timeout: 8_000 });
  });
});
