

## Plan: System Admin Panel + Coupon Management

### Overview

Create a complete admin panel ("System" view) accessible only to users with `app_role = 'admin'`, separate from the CRM team flow. This panel allows managing trial coupons with configurable plan, duration, and usage limits. Coupons can be redeemed during onboarding (skipping plan selection) or inside an existing team.

---

### 1. Database Migration

**New table: `trial_coupons`**
- `id` uuid PK
- `code` text UNIQUE NOT NULL
- `plan_id` uuid REFERENCES plans(id) — which plan the coupon grants
- `trial_days` integer NOT NULL DEFAULT 15 — configurable duration
- `max_uses` integer NOT NULL DEFAULT 1
- `times_used` integer NOT NULL DEFAULT 0
- `is_active` boolean DEFAULT true
- `description` text — internal note
- `created_by` uuid REFERENCES auth.users(id)
- `created_at` timestamptz DEFAULT now()
- `expires_at` timestamptz — optional expiry

RLS: Full access for `has_role(auth.uid(), 'admin')`. SELECT for authenticated users on active+non-expired coupons (for validation).

**New table: `coupon_redemptions`**
- `id` uuid PK
- `coupon_id` uuid REFERENCES trial_coupons(id)
- `team_id` uuid REFERENCES teams(id)
- `redeemed_by` uuid REFERENCES auth.users(id)
- `created_at` timestamptz DEFAULT now()
- UNIQUE(coupon_id, team_id)

RLS: INSERT for authenticated, SELECT for team members.

**New RPC: `redeem_trial_coupon(p_code text, p_team_id uuid)`**
- SECURITY DEFINER function
- Validates coupon (active, not expired, usage < max)
- Checks team hasn't already redeemed this coupon
- Gets the `plan_id` from the coupon record
- Increments `times_used`
- Records redemption
- Upserts into `subscriptions` with `status='trialing'`, `trial_ends_at = now() + trial_days`, using the coupon's `plan_id`
- Returns `{success, trial_days, plan_name}` or `{success: false, error}`

---

### 2. Admin Panel (New Pages)

**Route: `/admin`** — Protected by `app_role = 'admin'` check

New pages under a separate layout (no team context required):

**`src/pages/admin/AdminLayout.tsx`**
- Sidebar with: Dashboard, Coupons, Teams, Users
- Header with logo + logout
- Checks `useUserRole()` === 'admin', redirects otherwise

**`src/pages/admin/AdminDashboard.tsx`**
- Overview cards: total teams, total users, active subscriptions, active coupons
- Uses direct supabase queries (admin RLS)

**`src/pages/admin/AdminCoupons.tsx`**
- Table listing all coupons (code, plan, trial_days, uses, status, expiry)
- "Create Coupon" dialog: code (auto-generate or manual), select plan (from plans table), trial_days input, max_uses, optional expiry date, description
- Toggle active/inactive
- View redemptions per coupon

**`src/pages/admin/AdminTeams.tsx`**
- List all teams with subscription status
- View team details, members, subscription info

**`src/pages/admin/AdminUsers.tsx`**
- List all users (profiles) with their teams and roles

---

### 3. Admin Hooks

**`src/hooks/admin/useAdminStats.ts`** — Dashboard stats queries
**`src/hooks/admin/useAdminCoupons.ts`** — CRUD for trial_coupons
**`src/hooks/admin/useAdminTeams.ts`** — List all teams (admin RLS)
**`src/hooks/admin/useAdminUsers.ts`** — List all profiles

---

### 4. Coupon Redemption in Onboarding

**`src/hooks/useTrialCoupon.ts`**
- `useValidateCoupon(code)` — checks if code exists and is valid
- `useRedeemCoupon()` — mutation calling `redeem_trial_coupon` RPC

**`src/components/get-started/TeamStep.tsx`** changes:
- Add expandable "Tem um cupom de teste?" section
- Input field for coupon code with inline validation
- On valid coupon, show green badge with plan name + trial days
- Pass coupon code to parent via `onNext`

**`src/pages/GetStarted.tsx`** changes:
- When TeamStep provides a coupon code, skip steps 2+3
- After auth: create team → call `redeem_trial_coupon` RPC → redirect to dashboard
- Show processing state during redemption

---

### 5. Coupon Redemption in Team Config

**`src/pages/TeamConfig.tsx`** changes:
- Add "Aplicar Cupom" card for team admins
- Input + validate + redeem flow
- On success, invalidate subscription queries

---

### 6. Routing Changes (App.tsx)

```text
/admin              → AdminLayout wrapper
/admin/dashboard    → AdminDashboard
/admin/coupons      → AdminCoupons  
/admin/teams        → AdminTeams
/admin/users        → AdminUsers
```

These routes require auth but NOT team context. Protected by admin role check in the layout.

---

### 7. RLS for Admin Queries

Add SELECT policies on `teams`, `profiles`, `subscriptions`, `plans` for users with `has_role(auth.uid(), 'admin')` to enable the admin panel to query all data across the system.

---

### Files to Create
- `src/pages/admin/AdminLayout.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/AdminCoupons.tsx`
- `src/pages/admin/AdminTeams.tsx`
- `src/pages/admin/AdminUsers.tsx`
- `src/hooks/admin/useAdminStats.ts`
- `src/hooks/admin/useAdminCoupons.ts`
- `src/hooks/admin/useAdminTeams.ts`
- `src/hooks/admin/useAdminUsers.ts`
- `src/hooks/useTrialCoupon.ts`

### Files to Edit
- `src/App.tsx` — add admin routes
- `src/components/get-started/TeamStep.tsx` — add coupon input
- `src/pages/GetStarted.tsx` — handle coupon flow (skip plan)
- `src/pages/TeamConfig.tsx` — add coupon redemption card
- Database migration (2 tables + 1 RPC + RLS policies)

