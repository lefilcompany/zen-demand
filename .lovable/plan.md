

## Problem

The recurring demands system has the edge function `process-recurring-demands` fully implemented, but **no cron job exists** to actually invoke it. The `pg_cron` and `pg_net` extensions are enabled, but `cron.schedule(...)` was never called. So the function is never executed and demands are never auto-created.

## Solution

### Step 1: Schedule the cron job (via insert tool, NOT migration)

Use the Supabase insert tool to create a cron job that calls the edge function every minute:

```sql
SELECT cron.schedule(
  'process-recurring-demands',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dcojvsftpzwfhgvamdgm.supabase.co/functions/v1/process-recurring-demands',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb2p2c2Z0cHp3ZmhndmFtZGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODI2MjMsImV4cCI6MjA4NTg1ODYyM30.aPjTbTUQWV-zLGxaX2qw4tru7ew6AuFebnx53CDqyZA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

This runs every minute. When there are no demands to process, it returns quickly with `processed: 0`.

### Step 2: Add short-interval test frequencies

Update the `RecurrenceConfig.tsx` to add two test frequencies visible only in development: **"A cada 10s"** and **"A cada 1 min"**. These help verify the system works.

But since the cron already runs every minute, we don't need real 10s intervals. Instead, the approach is:

- Add a **"Teste (1 min)"** frequency option to the UI (only visible in dev/test mode)
- For this frequency, set `next_run_date` to "today" so the next cron cycle picks it up immediately
- Update the edge function to handle `frequency === "test_1min"` by setting next_run_date to current timestamp + 1 minute (formatted as today's date, so next cron picks it up again)

Actually, since cron runs every minute and the edge function checks `next_run_date <= today`, a simpler approach: just create a recurring demand with `next_run_date = today` and `frequency = daily`. The cron will pick it up within 60 seconds. For testing purposes, this is sufficient.

### Step 3: Add manual trigger button (for testing)

Add a "Processar agora" button in the `ScheduledDemandsModal` that manually invokes the edge function via `supabase.functions.invoke('process-recurring-demands')`. This lets users (and testers) trigger processing immediately without waiting for the cron.

### Files changed

1. **Cron job** — SQL via insert tool (not migration)
2. **`src/components/ScheduledDemandsModal.tsx`** — Add "Processar agora" button
3. **`supabase/functions/process-recurring-demands/index.ts`** — No changes needed, function is correct

### Technical details

- The edge function already uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- The cron job runs every minute; when no recurring demands are due, the function returns immediately
- The `status_id` stored in `recurring_demands` is used directly in the created demand — this should work as long as the status belongs to the target board
- The manual trigger button calls `supabase.functions.invoke()` which uses the anon key; the edge function creates a service-role client internally, so this is fine

