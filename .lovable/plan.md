

## Fixes: Scroll + Smooth Transition for Stage Form Panel

### Problems Identified

1. **No scroll on form panel**: The `hidden sm:flex` class on the form panel container (line 797) conflicts with flex layout. When `hidden` is toggled to `flex`, the overflow chain breaks. The inner `StageForm` has `overflow-y-auto` but the parent wrapper needs proper height constraints.

2. **Animation not smooth / "too dry"**: 
   - The unmount timer is 300ms but transition duration is 500ms — panel disappears before animation finishes.
   - `translate-x` of only `-8` (2rem) is too subtle to feel like "sliding from behind".
   - No visual depth cue (e.g. slight shadow growth, no z-index layering relative to main card).

### Plan

**File: `src/components/KanbanStagesManager.tsx`**

1. **Fix unmount timer** — change `setTimeout` from 300ms to 500ms to match `duration-500` transition.

2. **Enhance slide animation** — change entry from `-translate-x-8 scale-[0.97]` to `-translate-x-16 scale-95 opacity-0` for a more dramatic "from behind" slide. Add a slight delay or staggered feel using `ease-[cubic-bezier(0.16,1,0.3,1)]` (spring-like).

3. **Fix scroll on form panel** — ensure the form panel container properly constrains height with `min-h-0` on the flex-col wrapper so `overflow-y-auto` inside `StageForm` works.

4. **Add shadow growth on enter** — use conditional shadow classes (`shadow-2xl` when visible, `shadow-none` when hidden) to create a depth effect during the transition.

### Technical Details

- Line 528: `setTimeout(..., 300)` → `setTimeout(..., 500)`
- Lines 794-802: Update transition classes for more dramatic slide + shadow growth
- Ensure `min-h-0` is on the panel's flex container to enable scroll

