# Paperkit 📄✨

**Skeuomorphic Paper Library for the Modern Web**

Paperkit is an open-source TypeScript library that turns photos of real paper (receipts, notes, forms, letters, anything on paper) into tactile, physical-feeling paper objects in the browser. Users upload an image and get a sheet they can **drag, lift, curl, flip, and stack**.

Paperkit is a general-purpose, UI-only foundation: any app can use it to put paper on screen. It runs smoothly at **60fps with 50+ papers**, supports client-side OpenCV contour detection & deskewing, and persists layout losslessly through JSON.

---

## Features

- **Physically Believable**: Soft layered ambient shadows cast from a directional sun, lift on grab with shadow diffusion, drop settle animations with configurable rotation jitter.
- **Dog-Ear Corner Curl**: Interactive corner peeling with damped spring release physics (`amount: 0..1`).
- **3D Flip**: Flip sheets to reveal reverse-side images or realistic blank paper stock with ruled grain.
- **Client-Side Scanner**: Automatic quad detection, perspective deskewing, and contrast normalization powered by OpenCV.js inside a Web Worker. Supports JPEG, PNG, and HEIC (client-side Wasm decode).
- **Manual 4-Corner Refinement**: Fallback UI hook with interactive draggable corner pins for tricky or cluttered backgrounds.
- **Framework-Agnostic Core**: Zero DOM dependencies in `@paperkit/core` (runnable in Node, workers, or custom renderers), paired with a modern `@paperkit/render-css` engine and a thin `@paperkit/react` wrapper (`<PaperBoard/>`).
- **Lossless Serialization**: `board.toJSON()` and `Board.fromJSON()` round-trip layout and metadata losslessly.
- **100% Client-Side & Private**: No network calls; images never leave the device.

---

## 5-Minute Quickstart

### 1. Installation

```bash
# Core + CSS 3D Renderer
pnpm add @paperkit/core @paperkit/render-css

# Optional: React wrapper
pnpm add @paperkit/react

# Optional: Client-side scanner (OpenCV + HEIC decode)
pnpm add @paperkit/scan
```

### 2. Vanilla TypeScript

```ts
import { createBoard } from '@paperkit/core';
import { cssRenderer } from '@paperkit/render-css';
import { scanImage } from '@paperkit/scan';

// 1. Create and mount a board
const container = document.getElementById('board')!;
const board = createBoard({
  container,
  renderer: cssRenderer(),
});

// 2. Add an image directly
const paper = board.addPaper({
  image: {
    src: 'https://example.com/receipt.jpg',
    width: 600,
    height: 800,
  },
  meta: { title: 'Coffee Receipt' },
});

// 3. Or scan an uploaded file (automatic quad detect + deskew)
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const scanned = await scanImage(file);
  board.addPaper({
    image: { blob: scanned.blob, width: scanned.width, height: scanned.height },
    meta: { title: file.name },
  });
});

// 4. Save and restore layout
const json = board.toJSON();
localStorage.setItem('paperkit-board', JSON.stringify(json));
```

### 3. React Component

```tsx
import React from 'react';
import { PaperBoard, useBoard } from '@paperkit/react';

export function DeskApp() {
  const board = useBoard({
    dropJitter: 2.0,
    texture: { grain: true, edgeWear: true },
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PaperBoard
        board={board}
        onPaperClick={(paper) => console.log('Clicked:', paper.id)}
        onPaperMove={({ paper, to }) => console.log('Moved to:', to)}
      />
    </div>
  );
}
```

---

## Gestures & Controls

| Action           | Mouse / Touch Gesture                      | Keyboard Shortcut                             |
| :--------------- | :----------------------------------------- | :-------------------------------------------- |
| **Move**         | Drag anywhere on paper                     | `Arrow Keys` (Hold `Shift` for large steps)   |
| **Flip**         | Double-click or double-tap                 | `[F]`                                         |
| **Rotate**       | Drag circular handle above paper           | `[Q]` (counter-clockwise) / `[E]` (clockwise) |
| **Scale / Zoom** | Pinch on touchscreen or `Ctrl/Cmd + Wheel` | `[+]` / `[-]`                                 |
| **Dog-Ear Curl** | Drag from any of the 4 corners             | Visual toggle                                 |
| **Stacking**     | Click to bring to top                      | `[PageUp]` (front) / `[PageDown]` (back)      |
| **Deselect**     | Click board background                     | `[Escape]`                                    |

---

## Monorepo Packages

```text
paperkit/
├── packages/
│   ├── core/         # Pure data model, gestures, spring physics, serialization (No DOM)
│   ├── render-css/   # Hardware-accelerated CSS 3D renderer, dynamic lighting, textures
│   ├── scan/         # OpenCV.js edge/quad detection, perspective deskewing, HEIC decoder
│   └── react/        # <PaperBoard/> component and hooks (useBoard, useBoardPapers)
└── apps/
    └── playground/   # Interactive Vite demo: upload, deskew, arrange, book spread preview
```

---

## Running the Playground Locally

```bash
git clone https://github.com/maddyverse9/PaperKit.git
cd PaperKit

pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Tests

```bash
# Unit & integration tests (Vitest)
pnpm test

# End-to-end browser tests (Playwright)
pnpm e2e

# Typecheck all packages
pnpm typecheck
```

---

## Architecture Decision Records

- [ADR 001: OpenCV.js Lazy Loading](docs/decisions/001-opencv-lazy-loading.md)
- [ADR 002: Serialized Board JSON Shape](docs/decisions/002-board-json-shape.md)
- [ADR 003: Pure CSS 3D Corner Curl Technique](docs/decisions/003-css3d-curl-technique.md)
- [ADR 004: Client-Side HEIC Decoding](docs/decisions/004-heic-client-decode.md)

---

## License

MIT © [Paperkit Contributors](LICENSE)
