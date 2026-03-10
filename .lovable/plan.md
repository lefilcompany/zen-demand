

## Problems Identified

1. **Line breaks lost when images present**: `MentionInput` stores line breaks as `\n`. `RichTextDisplay.processContentWithLinks` only preserves `\n` via `whitespace-pre-wrap` when there are NO HTML tags. When `<img>` tags are present, it parses as HTML and `\n` are ignored by the browser.

2. **No drag-and-drop support**: `MentionInput` only handles paste for images, not drag-and-drop.

## Plan

### Fix 1: Convert `\n` to `<br>` before HTML processing (rich-text-editor.tsx)

In `processContentWithLinks`, before parsing as HTML, replace `\n` with `<br>` so line breaks survive the DOM parsing. This must be done carefully to avoid breaking existing `<br>` or block-level elements.

**File**: `src/components/ui/rich-text-editor.tsx` (~line 652)
- Before the HTML tag check, normalize `\n` to `<br>\n` when the content contains both HTML tags and `\n` characters
- This ensures MentionInput content (mixed `\n` + `<img>`) renders correctly

### Fix 2: Add drag-and-drop to MentionInput (MentionInput.tsx)

Add `onDragOver` and `onDrop` event handlers to the contentEditable div to accept dropped image files.

**File**: `src/components/MentionInput.tsx` (~line 720-742)
- Add `onDragOver` handler to prevent default and allow drop
- Add `onDrop` handler that reads dropped files, converts images to data URLs, inserts them at the drop position, and attaches resize handles
- Reuse the same image insertion logic from the paste handler

### Summary of changes
- **`src/components/ui/rich-text-editor.tsx`**: Fix `processContentWithLinks` to convert `\n` → `<br>` when content has HTML tags
- **`src/components/MentionInput.tsx`**: Add `onDragOver`/`onDrop` handlers for image drag-and-drop

