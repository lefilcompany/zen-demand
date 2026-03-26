

## Plan: Document Preview Modal (PDF, Images, etc.)

### Overview
Add an "Eye" preview button alongside the download button on all attachment items. Clicking it opens a full-screen modal that renders the document inline — PDFs via `<iframe>` with the signed URL, images as they already work. This avoids unnecessary downloads.

### Changes

**1. `src/components/InteractionAttachments.tsx`**
- Add `Eye` icon import from lucide-react
- For non-image files (PDFs, etc.), add a preview button next to download
- For images, keep existing expand behavior
- Add a new `DocumentPreviewDialog` that:
  - Opens a near-fullscreen modal (`max-w-[95vw] max-h-[95vh]`)
  - Loads the signed URL on open
  - Renders PDFs via `<iframe src={signedUrl} />` (browsers render PDFs natively with page-by-page navigation)
  - Shows file name + download button in footer
  - Shows a loading spinner while the URL is being fetched

**2. `src/components/AttachmentUploader.tsx`**
- Same pattern: add preview button for previewable file types (PDF, images)
- Reuse the same modal approach with `<iframe>` for PDFs

**3. `src/components/RequestAttachmentUploader.tsx`**
- Same pattern applied to request attachments

### How PDF Preview Works
- Use the browser's native PDF viewer via `<iframe src={signedUrl} type="application/pdf" />` 
- This gives page-by-page navigation, zoom, search — all built-in, zero extra dependencies
- Previewable types: `application/pdf`, `image/*`, `text/plain`
- Non-previewable types: only show download button (no preview icon)

### UI Design
- Preview button: `Eye` icon, ghost variant, same size as download button (`h-7 w-7`)
- Modal: dark overlay, `max-w-[95vw] h-[90vh]`, iframe fills available space
- Header bar with file name + close button
- Footer with file size + download button
- Follows existing dialog patterns and system colors

