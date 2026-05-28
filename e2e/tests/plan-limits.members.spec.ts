// Members are added to a team via the `join_team_with_code` RPC (RLS-safe path).
// The UI flow needs an admin approval round-trip, so we validate the trigger
// at the live RPC layer using supabase-js — still a real end-to-end against
// the production database trigger `enforce_team_member_limit`.

import { test, expect } from "../fixtures/test";
import { createClient } from "@supabase/supabase-js";
import { seedExtraUser, cleanupEmails } from "../fixtures/seed";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

test.describe("Plan limits — Members (team join)", () => {
  test("Starter (max_members=3): join_team_with_code rejects the 4th member", async ({ seeded }) => {
    const team = await seeded("starter", "members"); // 3 members already in
    const extra = await seedExtraUser();

    try {
      const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
      const { error: signInErr } = await sb.auth.signInWithPassword({
        email: extra.email,
        password: extra.password,
      });
      expect(signInErr).toBeNull();

      const { error } = await sb.rpc("join_team_with_code", { p_code: team.accessCode });
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/PLAN_LIMIT_MEMBERS/);
      expect(error!.message).toMatch(/3 membro/);
    } finally {
      await cleanupEmails([extra.email]);
    }
  });
});
