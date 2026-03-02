
# Google Calendar + Meet Integration

## Overview
Add the ability to schedule Google Calendar meetings (with Meet link) directly from the demand creation flow. When a service of type "Reuniao" is selected, conditional meeting fields appear. On submit, a backend function creates the calendar event and returns the Meet link.

## Architecture

```text
+-------------------+       +-------------------------+       +--------------------+
| Frontend Form     | ----> | Edge Function           | ----> | Google Calendar    |
| (CreateDemand.tsx) |       | create-calendar-event   |       | API + Meet         |
+-------------------+       +-------------------------+       +--------------------+
     |                              |
     | 1. Create demand             | 2. Sign JWT with
     |    in database               |    Service Account
     | 3. Call edge function         | 4. Create event
     | 5. Show success/error         |    with attendees
```

## Step 1: Configure Secrets

Two new secrets need to be stored:
- **GOOGLE_SERVICE_ACCOUNT_EMAIL**: `somabotlefil@somalefil.iam.gserviceaccount.com`
- **GOOGLE_PRIVATE_KEY**: The private key from the uploaded JSON file

These will be requested via the `add_secret` tool.

## Step 2: Edge Function `create-calendar-event`

**File**: `supabase/functions/create-calendar-event/index.ts`

The function will:
1. Receive a POST with: `title`, `description`, `startTime`, `endTime`, `attendeeEmails`
2. Authenticate the calling user via JWT (getClaims)
3. Use the `jose` library (npm:jose) to sign a Google-compatible JWT with the service account credentials
4. Exchange the JWT for an access token at `https://oauth2.googleapis.com/token`
5. POST to Google Calendar API to create an event with:
   - Summary, description, start/end times
   - Attendees array from provided emails
   - `conferenceData.createRequest` for auto-generating Meet link
   - `sendUpdates=all` so attendees get email invites
6. Return the event link and Meet link in the response

Key technical detail: Since `jose` is Deno-compatible, we'll use `npm:jose` to create and sign the JWT with RS256 algorithm and the service account's private key.

## Step 3: Frontend - Meeting Fields in CreateDemand

**File**: `src/pages/CreateDemand.tsx` (and `CreateDemandQuickDialog.tsx`)

When the selected service name matches "Reuniao" (case-insensitive check):
- Show conditional fields:
  - **Start Date/Time**: datetime-local input
  - **End Date/Time**: datetime-local input  
  - **Attendee Emails**: Multi-input field (emails) OR auto-populated from selected assignees' emails plus the creator's email
- Validation: start and end times are required when meeting mode is active

Since profiles don't store emails, the edge function will receive user IDs and look them up via service role key against `auth.users`. Alternatively, the frontend will collect emails manually via an input field (simpler and more flexible -- attendees may include external people).

**Approach chosen**: A dedicated email input field where users can type multiple emails. Board member emails will be fetched and shown as suggestions. The creator's email is auto-included.

## Step 4: Integration Flow on Submit

In the `handleSubmit` of `CreateDemand.tsx`:

1. Create the demand as usual (existing flow)
2. If the service is "Reuniao" and meeting fields are filled:
   - Call `supabase.functions.invoke('create-calendar-event', { body: { title, description, startTime, endTime, attendeeEmails } })`
   - On success: show toast with Meet link
   - On failure: show warning toast (demand was still created)
3. Optionally store the Meet link in the demand's metadata or description

## Step 5: New Components

- **`src/components/MeetingFields.tsx`**: Reusable component with start/end datetime inputs and email multi-input
- **`src/hooks/useCreateCalendarEvent.ts`**: Hook wrapping the edge function invocation

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/create-calendar-event/index.ts` | Create |
| `src/components/MeetingFields.tsx` | Create |
| `src/hooks/useCreateCalendarEvent.ts` | Create |
| `src/pages/CreateDemand.tsx` | Modify (add meeting fields + integration) |
| `src/components/CreateDemandQuickDialog.tsx` | Modify (add meeting fields + integration) |

## Technical Details

- The "Reuniao" service already exists in the database (ID: `13a8a846-...`)
- Detection will be by service name (case-insensitive match against "reuniao" / "reunião")
- The edge function uses `npm:jose` for JWT signing (no esm.sh)
- CORS headers included for web app compatibility
- `verify_jwt = false` in config.toml with manual auth validation in code
- The `conferenceDataVersion=1` query parameter is required for Meet link generation
- A unique `requestId` (UUID) is needed for `conferenceData.createRequest`
