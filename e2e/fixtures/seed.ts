import "dotenv/config";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dcojvsftpzwfhgvamdgm.supabase.co";
const E2E_SECRET = process.env.E2E_SEED_SECRET || "";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!E2E_SECRET) {
  // eslint-disable-next-line no-console
  console.warn("⚠️  E2E_SEED_SECRET not set. Edge function calls will fail.");
}

export type PlanSlug = "starter" | "profissional" | "business" | "enterprise";
export type Resource = "boards" | "members" | "demands" | "services" | "notes";

export interface SeededTeam {
  email: string;
  password: string;
  userId: string;
  teamId: string;
  boardId: string;
  accessCode: string;
  planName: string;
  planSlug: string;
  firstStatusId: string | null;
  extraEmails: string[];
}

async function call(op: string, payload: Record<string, unknown> = {}) {
  const url = `${SUPABASE_URL}/functions/v1/e2e-seed`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-e2e-secret": E2E_SECRET,
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ op, ...payload }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`e2e-seed ${op} failed (${res.status}): ${text}`);
  return body;
}

export async function seedTeam(opts: { plan: PlanSlug; fill?: Resource | null }): Promise<SeededTeam> {
  return await call("seed", { plan: opts.plan, fill: opts.fill ?? null });
}

export async function seedExtraUser(): Promise<{ email: string; password: string; userId: string }> {
  return await call("extra_user");
}

export async function cleanupEmails(emails: string[]): Promise<void> {
  if (!emails.length) return;
  await call("cleanup", { emails });
}
