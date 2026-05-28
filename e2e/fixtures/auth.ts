import { type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dcojvsftpzwfhgvamdgm.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID || "dcojvsftpzwfhgvamdgm";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
}

/** Sign in via supabase-js (no UI) and return the session payload. */
export async function signInProgrammatic(email: string, password: string): Promise<Session> {
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: { id: data.session.user.id, email: data.session.user.email ?? undefined },
  };
}

/** Inject Supabase auth + selected team into the browser before navigation. */
export async function primeBrowser(
  context: BrowserContext,
  session: Session,
  selectedTeamId: string,
  baseURL: string,
): Promise<void> {
  // Use addInitScript so the storage is present BEFORE app code reads it.
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: 3600,
    token_type: "bearer",
    user: session.user,
  };
  const script = `
    try {
      window.localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(payload))});
      window.localStorage.setItem("selectedTeamId", ${JSON.stringify(selectedTeamId)});
    } catch (e) { console.warn("prime failed", e); }
  `;
  await context.addInitScript({ content: script });
  // Touch the origin once so storage applies.
  const page = await context.newPage();
  await page.goto(baseURL + "/welcome", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.close();
}

export async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
}
