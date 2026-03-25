

## Plan: Transform Comments into Discord-Style Chat with Channel System

### Overview
Transform the current comment/interaction section in DemandDetail into a modern, Discord-inspired chat interface with two channels: **Internal Chat** (agents only, hidden from requesters) and **General Chat** (visible to all including requesters).

### Database Changes

**Add `channel` column to `demand_interactions` table:**
- New column: `channel TEXT NOT NULL DEFAULT 'general'` (values: `'internal'` or `'general'`)
- Update RLS: Add a policy that filters `internal` channel messages -- requesters can only SELECT interactions where `channel = 'general'`
- Create a security definer function `can_view_interaction(interaction_id, user_id)` that checks board role and channel visibility

### New Component: `DemandChat.tsx`
A self-contained chat component replacing the current "Historico" Card in DemandDetail. Structure:

```text
┌──────────────────────────────────────────────┐
│  # Geral    # Interno 🔒                     │  ← Channel tabs (Internal hidden for requesters)
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ avatar ── nome ──── 14:32 ─────────┐    │  ← Messages grouped by user/time
│  │  Message content here               │    │     (Discord-style: consecutive msgs
│  │  Another message from same user     │    │     from same user are grouped)
│  └─────────────────────────────────────┘    │
│                                              │
│  ── Hoje ──────────────────────────────      │  ← Date separators
│                                              │
│  ┌─ avatar ── nome ──── 15:10 ─────────┐    │
│  │  New message with hover actions     │    │  ← Hover reveals: edit, delete, copy
│  └─────────────────────────────────────┘    │
│                                              │
│  🟢 João está digitando...                   │  ← Typing indicator
├──────────────────────────────────────────────┤
│  [+] │ Write a message...        │ [Send]   │  ← Input bar at bottom (fixed)
│      │ @ mentions, file paste    │          │
└──────────────────────────────────────────────┘
```

### Design Details (Discord-Inspired)
- **Dark-toned chat area** with `bg-muted/30` background and subtle rounded message bubbles
- **Channel tabs** styled like Discord channels with `#` prefix and lock icon for internal
- **Message grouping**: consecutive messages from same user within 5 minutes show only content (no repeated avatar/name)
- **Date separators**: horizontal line with date badge in center
- **Hover actions**: message actions appear on hover (edit, delete, copy) as a floating toolbar
- **Scroll area** with auto-scroll to bottom on new messages, "scroll to bottom" fab when scrolled up
- **Input bar** pinned at bottom with attachment button, mention support, send button
- **Status/adjustment interactions** rendered as system messages (centered, muted, with icon)
- **Internal channel** has a subtle colored border/indicator (e.g., blue tint) to visually distinguish

### Files to Create/Edit

1. **Migration**: Add `channel` column + RLS policy for channel-based visibility
2. **`src/components/DemandChat.tsx`** (NEW): Main chat component with channel tabs, message list, input bar
3. **`src/components/DemandChatMessage.tsx`** (NEW): Individual message rendering with grouping logic, hover actions
4. **`src/components/DemandChatInput.tsx`** (NEW): Bottom input bar with mentions, file upload, send
5. **`src/hooks/useDemands.ts`**: Update `useDemandInteractions` to accept `channel` filter, update `useCreateInteraction` to include channel
6. **`src/pages/DemandDetail.tsx`**: Replace the entire "Historico" Card section with `<DemandChat>`, move notification logic into the chat component or keep as callback
7. **`src/hooks/useTypingIndicator.ts`**: Add channel awareness to typing broadcasts

### Key Logic
- **Channel visibility**: `boardRole === 'requester'` users see only "Geral" tab; agents/admins see both tabs
- **Default channel**: "Geral" for requesters, "Interno" for agents (last used preference)
- **Adjustment requests** continue to work as before but render as system messages in the appropriate channel
- **Status changes** render as system messages in "Geral"
- **Existing interactions** (no channel column) default to `'general'` via the column default

### Technical Details
- Query: `useDemandInteractions(demandId, channel)` filters by channel
- Interactions ordered `ascending` (oldest first) for chat UX (currently descending)
- Auto-scroll to latest message using `useRef` + `scrollIntoView`
- Realtime subscription already exists via `useRealtimeDemandDetail` -- will trigger re-fetch on new messages
- Message grouping computed via `useMemo` comparing consecutive messages' `user_id` and timestamp delta

