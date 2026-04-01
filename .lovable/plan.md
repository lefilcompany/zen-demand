

## Problem

The recurring demand with `test_1min` frequency **never gets saved to the database** because there's a CHECK constraint on the `frequency` column:

```
CHECK (frequency = ANY (ARRAY['daily', 'weekly', 'biweekly', 'monthly']))
```

Values `test_1min` and `test_5min` are rejected, so the insert silently fails (error caught in try/catch, shown as a warning toast). The "Demandas Agendadas" modal shows empty because the table has zero rows.

Additionally, `next_run_date` is a `date` column (not `timestamptz`), so the edge function's `lte('next_run_date', today)` check will always match once set to today. The cooldown logic using `last_generated_at` in the edge function handles this, but it's fragile.

## Solution

### Step 1: Update the CHECK constraint (migration)

Alter the constraint to accept the test frequencies:

```sql
ALTER TABLE recurring_demands DROP CONSTRAINT recurring_demands_frequency_check;
ALTER TABLE recurring_demands ADD CONSTRAINT recurring_demands_frequency_check 
  CHECK (frequency = ANY (ARRAY['daily', 'weekly', 'biweekly', 'monthly', 'test_1min', 'test_5min']));
```

### Step 2: Improve edge function cooldown reliability

The edge function already has cooldown logic for test frequencies using `last_generated_at`. This is correct and sufficient. No changes needed to the edge function.

### Step 3: No other changes needed

- The UI (`RecurrenceConfig.tsx`) already supports `test_1min` and `test_5min`
- The hook (`useRecurringDemands.ts`) already calculates `next_run_date` correctly for test frequencies (sets to today)
- The cron job is running every minute (confirmed by logs)
- The `ScheduledDemandsModal` already has the "Processar agora" button

### Why it will work after the fix

1. User creates demand with `test_1min` → insert succeeds (constraint allows it)
2. `next_run_date` = today → cron picks it up within 1 minute
3. Edge function creates the demand, sets `last_generated_at = now()`, keeps `next_run_date = today`
4. Next cron run: checks cooldown (`now - last_generated_at < 60s`) → skips if too soon
5. After 60s: cooldown elapsed → creates another demand

### Files changed

1. **Migration SQL** — drop + re-add CHECK constraint to include `test_1min` and `test_5min`

That's it — one single database constraint fix resolves the entire issue.

