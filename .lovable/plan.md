

## Problem

Multiple issues with attachment preview modals across demands and chat:

1. **Two overlapping close buttons**: `DialogContent` already renders an X button (from `dialog.tsx` line 45-48), and some modals add a second manual X button
2. **Download opens new tab instead of downloading**: `window.open(url, "_blank")` and `<a href={url} target="_blank">` just navigate to the signed URL — they don't trigger a real download
3. **Chat attachments (non-image) only show download, no preview**: `CommentAttachments` only has a download button for files, no way to open `DocumentPreviewDialog`
4. **Image preview in chat** uses a raw Dialog with manual X button (duplicate close)

## Solution

### 1. Fix `DocumentPreviewDialog` — remove duplicate close button, fix download

- Remove the header's manual close button since `DialogContent` already provides one
- Fix download: fetch as blob → create object URL → use `<a download>` trick to force real download instead of opening new tab
- Style: position the native DialogContent X button properly so it doesn't overlap with the "Baixar" button

### 2. Fix `AttachmentUploader` image preview — remove duplicate X, fix download

- In the image expanded dialog, remove the manual `<Button>` with X icon (DialogContent already has one)
- Fix download: use blob fetch + `<a download>` pattern

### 3. Fix `InteractionAttachments` (chat) — remove duplicate X, fix download, add preview for files

- Remove manual X button in image preview dialog
- Fix `handleDownload` to use blob download
- For non-image files: add the same preview capability using `DocumentPreviewDialog`

### 4. Fix `CommentAttachments` — add file preview, remove duplicate X, fix download

- Add `DocumentPreviewDialog` for non-image file attachments (click to preview)
- Remove manual X button from image preview dialog
- Fix download to use blob pattern
- Add an Eye icon button for previewable files

### 5. Create shared download utility

- Add a `downloadFileFromUrl(signedUrl, fileName)` helper in a utils file that fetches as blob and triggers a real download via anchor element with `download` attribute

### Files to change

1. **`src/lib/fileDownloadUtils.ts`** (new) — shared blob download function
2. **`src/components/DocumentPreviewDialog.tsx`** — fix download, remove redundant close button styling
3. **`src/components/AttachmentUploader.tsx`** — remove duplicate X, use blob download
4. **`src/components/InteractionAttachments.tsx`** — remove duplicate X, use blob download
5. **`src/components/CommentAttachments.tsx`** — add DocumentPreviewDialog for files, remove duplicate X, use blob download

