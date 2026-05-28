import { test, expect } from "../fixtures/test";

test.describe("Plan limits — Notes", () => {
  test("Starter (max_notes=0): blocks 'Nova Nota' immediately", async ({ page, seeded, loginAs }) => {
    const team = await seeded("starter"); // notes not allowed at all on starter
    await loginAs(team);

    await page.goto("/notes", { waitUntil: "networkidle" });
    const cta = page.getByRole("button", { name: /nova nota|criar nota|criar primeira nota/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    await expect(page.getByText(/não inclui notas|permite até 0 nota/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
  });

  test("Profissional (max_notes=10): blocks 'Nova Nota' when 10 already exist", async ({ page, seeded, loginAs }) => {
    const team = await seeded("profissional", "notes");
    await loginAs(team);

    // Warm-up: hit the dashboard first so TeamContext settles before we navigate to /notes.
    await page.goto("/", { waitUntil: "networkidle" });

    await page.goto("/notes", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /soma notes/i })).toBeVisible({ timeout: 20_000 });

    const cta = page.getByRole("button", { name: /nova nota|criar nota/i }).first();
    await cta.waitFor({ state: "visible", timeout: 15_000 });
    await cta.click();

    // Limit toast appears regardless of whether the seeded notes are rendered yet —
    // the RPC `check_plan_limit` counts rows server-side.
    await expect(
      page.getByText(/permite até 10 nota|limite de notas atingido|PLAN_LIMIT_NOTES.*10 nota/i)
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /ver planos/i })).toBeVisible();
  });
});
