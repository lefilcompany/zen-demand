import { test as base, expect } from "@playwright/test";
import { cleanupEmails, seedTeam, type PlanSlug, type Resource, type SeededTeam } from "./seed";
import { primeBrowser, signInProgrammatic } from "./auth";

interface Fixtures {
  /** Seed a team for the given plan/fill scenario and return its data. */
  seeded: (plan: PlanSlug, fill?: Resource | null) => Promise<SeededTeam>;
  /** Login the seeded owner in the browser context and goto baseURL. */
  loginAs: (team: SeededTeam) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  seeded: async ({}, use) => {
    const created: SeededTeam[] = [];
    const fn = async (plan: PlanSlug, fill: Resource | null = null) => {
      const team = await seedTeam({ plan, fill });
      created.push(team);
      return team;
    };
    await use(fn);
    const emails: string[] = [];
    for (const t of created) {
      emails.push(t.email);
      emails.push(...t.extraEmails);
    }
    if (emails.length) {
      try { await cleanupEmails(emails); } catch (e) { console.warn("cleanup failed", e); }
    }
  },

  loginAs: async ({ context, baseURL }, use) => {
    const fn = async (team: SeededTeam) => {
      const session = await signInProgrammatic(team.email, team.password);
      await primeBrowser(context, session, team.teamId, baseURL || "http://localhost:8080");
    };
    await use(fn);
  },
});

export { expect };
