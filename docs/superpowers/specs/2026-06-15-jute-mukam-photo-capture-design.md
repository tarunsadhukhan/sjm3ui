# Jute Mukam Received — Photo Capture

**Date:** 2026-06-15
**Page:** `src/app/dashboardportal/jutePurchase/juteMukamRecv/page.tsx`
**Backend:** `src/juteProcurement/juteMukamRecv.py`

## Goal

Let the user capture a photo while creating a Jute Mukam Received entry, store it
in the database as an HTML `<img>` snippet, and show the photo (read-only) when an
existing entry is opened.

## Decisions

- **Capture:** live device camera via `navigator.mediaDevices.getUserMedia`
  (`facingMode: "environment"`), shown in an MUI `Dialog`.
- **Storage:** an HTML string `<img src="data:image/jpeg;base64,..." />` saved in a
  new `LONGTEXT` column. Captured frame is downscaled to ~1280px max edge and encoded
  JPEG quality ~0.7 to keep the row small.
- **Edit/view:** photo is capture-once. Saved entries render the photo only (no
  capture controls), like `geo_location` today.
- **Optional:** photo is not required to save.
- **Secure context:** camera needs HTTPS/localhost — reuse the existing geolocation
  secure-context guard and warning.

## Changes

### 1. Database — `dbqueries/migrations/add_mukam_photo_to_jute_mukam_recvd.sql`
```sql
ALTER TABLE jute_mukam_recvd ADD COLUMN mukam_photo LONGTEXT NULL;
```

### 2. Backend — `juteMukamRecv.py`
- `_RECVD_BY_NO_SQL`: add `mukam_photo` to SELECT.
- `_INSERT_SQL` + `_row_payload`: persist `mukam_photo` from the request body.
- `_UPDATE_SQL`: unchanged — does not alter `mukam_photo` (capture-once).

### 3. Frontend service — `juteMukamRecvService.ts`
- Add optional `mukam_photo` to `MukamRecvEntry` and `MukamRecvPayload`.

### 4. Frontend page — `page.tsx`
- Add `mukam_photo` to `MukamForm` / `emptyForm`.
- `CameraCapture` flow: "Take Photo" → Dialog with `<video>` stream → "Capture"
  draws to `<canvas>`, downscales + JPEG-encodes, builds the `<img>` HTML string.
  Tracks `.stop()`ed on close/unmount.
- New/editable: show capture button + thumbnail preview (with clear/retake).
- Read-only: render stored `mukam_photo` via `dangerouslySetInnerHTML` (content is
  controlled — we only ever write our own `<img>`).
- Load `mukam_photo` in `handleSelectNo`; send it in `handleSubmit` payload.

## Out of scope
- Editing/replacing a photo after save.
- Multiple photos per entry.
