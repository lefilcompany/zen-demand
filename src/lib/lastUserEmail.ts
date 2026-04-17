/**
 * Persists the last logged-in user's email so we can show a friendly
 * message after they clear browser storage / cookies.
 *
 * Strategy:
 *  - localStorage (fast, easy)
 *  - Cookie with 1 year expiry as fallback (survives some "clear site data"
 *    flows that wipe localStorage but not cookies, and vice-versa)
 */

const STORAGE_KEY = "soma:lastEmail";
const COOKIE_KEY = "soma_last_email";
const ONE_YEAR_DAYS = 365;

function setCookie(name: string, value: string, days: number) {
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    if (!match) return null;
    return decodeURIComponent(match.split("=")[1] || "");
  } catch {
    return null;
  }
}

export function rememberLastEmail(email: string) {
  if (!email) return;
  const trimmed = email.trim().toLowerCase();
  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // ignore
  }
  setCookie(COOKIE_KEY, trimmed, ONE_YEAR_DAYS);
}

export function getLastEmail(): string | null {
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY);
    if (fromLs) return fromLs;
  } catch {
    // ignore
  }
  return getCookie(COOKIE_KEY);
}

/**
 * Returns true if we have a remembered email but no active Supabase session
 * token in localStorage — strong signal that the user cleared cache/cookies.
 */
export function looksLikeClearedCache(): boolean {
  const last = getLastEmail();
  if (!last) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("auth-token")) {
        return false; // session still present
      }
    }
    return true;
  } catch {
    return false;
  }
}
