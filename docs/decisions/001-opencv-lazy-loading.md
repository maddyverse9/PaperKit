# ADR 001: OpenCV.js Lazy Loading

## Context

Accurate quad detection and perspective deskewing for paper photos require robust computer vision algorithms (grayscale, Gaussian blur, Canny edge detection, contour approximation, and homography/perspective warp). OpenCV.js provides an industrial-grade implementation of these algorithms, but its compiled WebAssembly/asm.js bundle is ~8–15 MB.

Shipping this dependency in the main application bundle would severely penalize initial page load and Time-to-Interactive (TTI).

## Decision

1. Lazy-load `@techstark/opencv-js` via dynamic `import()` exclusively inside the scanning pipeline on demand.
2. The initial core library and CSS renderer contain zero OpenCV code, keeping the core runtime under 100 kB gzipped.
3. Provide a lightweight fallback if OpenCV fails to initialize, returning the original photo with an interactive 4-corner manual adjustment hook.

## Consequences

- Initial bundle size remains lightweight (< 100 kB gzip).
- Only users who trigger a document scan download the OpenCV bundle.
- In environments without OpenCV support (e.g. headless tests), the fallback logic ensures uninterrupted operation.
