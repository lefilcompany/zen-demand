

## Plan: Fix Google Calendar Integration with Standalone OAuth Flow

### Problem
The `useGoogleCalendar.ts` hook calls `supabase.auth.signInWithOAuth({ provider: 'google' })` directly, which fails with "missing OAuth secret" because Lovable Cloud manages Google OAuth through `lovable.auth`, not through Supabase's GoTrue directly. Additionally, even if we switch to `lovable.auth.signInWithOAuth`, the `provider_token` (Google's access token) is not preserved in the session because Lovable Cloud's flow only returns Supabase JWT tokens.

### Solution: Standalone Google OAuth Flow for Calendar

Instead of relying on the auth session's `provider_token`, we'll implement a **separate OAuth 2.0 flow** specifically for Google Calendar. This completely decouples calendar access from the login mechanism.

```text
┌──────────┐    ┌──────────────────────┐    ┌────────┐    ┌──────────┐
│ Settings │───>│ Edge: google-calendar │───>│ Google │───>│ Callback │
│  Button  │    │  -auth (get URL)     │    │ OAuth  │    │  /gcal   │
└──────────┘    └──────────────────────┘    └────────┘    └──────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Edge: exchange   │
                                                    │ code for tokens  │
                                                    │ → store in DB    │
                                                    └──────────────────┘
```

### Requirements
Two new secrets needed: **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET** (from the same Google Cloud project used for login). The user will need to provide these.

### Database Changes
Create a `google_calendar_tokens` table:
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, unique)
- `access_token` (text)
- `refresh_token` (text)
- `token_expires_at` (timestamptz)
- `created_at`, `updated_at`
- RLS: users can only read/manage their own tokens

### Files to Create
1. **`supabase/functions/google-calendar-auth/index.ts`** — Two actions:
   - `action: "authorize"`: Builds Google OAuth URL with `calendar.events` scope and redirects
   - `action: "callback"`: Exchanges auth code for tokens, stores in DB, redirects back to `/settings`
   - `action: "refresh"`: Refreshes expired access tokens using stored refresh_token

### Files to Edit
1. **`src/hooks/useGoogleCalendar.ts`** — Refactor completely:
   - Check connection via DB query (`google_calendar_tokens` table) instead of `provider_token`
   - `connectGoogleCalendar()`: Opens the edge function authorize URL (full redirect)
   - `createCalendarEvent()`: Fetches stored token from DB, refreshes if expired, passes to `create-calendar-event`
   - Add `disconnectGoogleCalendar()` to delete stored tokens

2. **`src/pages/Settings.tsx`** — Add disconnect button, update connection status display

3. **`supabase/functions/create-calendar-event/index.ts`** — Minor update: also accept fetching token from DB as fallback

4. **Frontend callback route**: Add `/settings/gcal-callback` route that captures the auth code from URL, sends to edge function, then redirects to `/settings`

### Flow Summary
1. User clicks "Conectar Google Calendar" → redirected to Google consent (with calendar scope only)
2. Google redirects back → edge function exchanges code → stores tokens in `google_calendar_tokens`
3. When creating a meeting → hook fetches stored Google token from DB → passes to edge function
4. If token expired → automatically refreshes using stored refresh_token

