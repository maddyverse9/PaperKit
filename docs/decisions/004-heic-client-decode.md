# ADR 004: Client-Side HEIC Decoding

## Context

Many modern smartphone cameras (notably Apple iOS devices) capture receipts and documents in high-efficiency HEIC/HEIF format. Non-Safari browsers (Chrome, Firefox) do not decode HEIC natively. Because Paperkit has a strict non-functional requirement: "No network calls. Images never leave the device", decoding must occur entirely client-side.

## Decision

1. Detect HEIC format via MIME type, file extension, and container magic bytes (`ftypheic`, `ftypmif1`, etc.).
2. If HEIC is detected, lazy-load the WebAssembly decoder `heic-to` (`libheif-js`) on demand.
3. Convert the HEIC container directly into standard PNG/JPEG image blobs in memory before running edge detection.

## Consequences

- Zero backend dependencies; images never leave the user's device.
- iPhone photos can be dragged/dropped directly into Paperkit on any browser.
- Heavy decoder (~3 MB) is only fetched when a HEIC file is provided.
