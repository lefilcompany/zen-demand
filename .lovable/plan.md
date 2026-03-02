

# Fix: "Proxima criacao" showing today instead of the next real date

## Problem
The `calculateNextRunDate` function in `src/hooks/useRecurringDemands.ts` has a logic bug on line 172:

```
if (start >= today) { ... }
```

When `start_date` equals today (e.g. 2026-02-24), this condition is `true`, so it returns today's date. But the demand for today was already created -- the next creation should be **tomorrow** (2026-02-25 for daily).

## Fix

**File: `src/hooks/useRecurringDemands.ts`** (line 172)

Change the condition from `>=` to strictly `>`:

```typescript
// Before
if (start >= today) {

// After
if (start > today) {
```

This single-character change makes the function fall through to the frequency-specific logic (daily -> tomorrow, weekly -> next matching weekday, etc.) whenever `start_date` is today or in the past, which correctly computes the next future run date.

No other files need changes -- `ScheduledDemandsModal.tsx` already calls this function and will display the corrected date automatically.

