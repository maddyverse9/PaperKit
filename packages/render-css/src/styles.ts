/**
 * Base stylesheet for @paperkit/render-css.
 * Injected once into document head if available.
 */

export const GRAIN_SVG_DATA =
  'data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.45"/></svg>';

export const STYLES = `
.paperkit-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  perspective: 1200px;
  background-color: transparent;
}

.paperkit-surface {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.paperkit-paper {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
  outline: none;
  cursor: grab;
  transition: transform 0.24s cubic-bezier(0.18, 0.89, 0.32, 1.15), filter 0.2s ease;
}

.paperkit-paper:active,
.paperkit-paper.paperkit-dragging {
  cursor: grabbing;
  transition: none !important;
}

.paperkit-paper:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 4px;
}

.paperkit-paper-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.25s ease;
  border-radius: 1px;
}

.paperkit-paper.paperkit-flipped .paperkit-paper-inner {
  transform: rotateY(180deg);
}

.paperkit-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 1px;
  overflow: hidden;
  background-color: #fbfaf8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paperkit-face-front {
  transform: rotateY(0deg);
}

.paperkit-face-back {
  transform: rotateY(180deg);
  background-color: #f6f3ed;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px);
  background-size: 100% 24px;
}

.paperkit-image {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  pointer-events: none;
}

.paperkit-face-blank {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.6;
}

/* Texture overlays */
.paperkit-overlay-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url('${GRAIN_SVG_DATA}');
  background-repeat: repeat;
  mix-blend-mode: multiply;
  opacity: 0.16;
  z-index: 2;
}

.paperkit-overlay-edgewear {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 10px rgba(90, 70, 45, 0.18), inset 0 0 2px rgba(45, 30, 15, 0.28);
  border: 1px solid rgba(0, 0, 0, 0.04);
  z-index: 3;
}

.paperkit-overlay-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: soft-light;
  z-index: 4;
}

/* Corner Curl Flap */
.paperkit-curl-flap {
  position: absolute;
  pointer-events: none;
  z-index: 5;
  background: #f1ede4;
  box-shadow: 0 4px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12);
  transition: opacity 0.15s ease;
}

/* Rotate handle */
.paperkit-rotate-handle {
  position: absolute;
  left: 50%;
  width: 22px;
  height: 22px;
  transform: translate(-50%, -50%);
  background: #ffffff;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  cursor: grab;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.paperkit-rotate-handle:active {
  cursor: grabbing;
  background: #3b82f6;
}

.paperkit-rotate-handle::before {
  content: '';
  position: absolute;
  top: 22px;
  left: 50%;
  width: 1px;
  height: var(--handle-stem-height, 18px);
  background: #3b82f6;
  transform: translateX(-50%);
}

.paperkit-rotate-handle svg {
  width: 12px;
  height: 12px;
  stroke: #3b82f6;
  stroke-width: 2.2;
  fill: none;
}

.paperkit-rotate-handle:active svg {
  stroke: #ffffff;
}

/* Reduced motion overrides */
.paperkit-reduced-motion .paperkit-paper,
.paperkit-reduced-motion .paperkit-paper-inner,
.paperkit-reduced-motion .paperkit-curl-flap {
  transition: none !important;
  animation: none !important;
}
`;

let injected = false;
export function injectStyles(): void {
  if (injected) return;
  if (typeof document === 'undefined') return;
  const styleEl = document.createElement('style');
  styleEl.id = 'paperkit-render-css-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
  injected = true;
}
