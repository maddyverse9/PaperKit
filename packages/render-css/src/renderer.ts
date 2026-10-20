/**
 * CSS 3D Renderer for Paperkit.
 * Transforms paper objects into tactile, hardware-accelerated 3D elements.
 */
import type {
  Corner,
  Light,
  RenderFrame,
  RenderPaper,
  Renderer,
  RendererContext,
} from '@paperkit/core';
import { injectStyles } from './styles.js';

export interface CSSRendererOptions {
  /** Optional custom class to append to the root board element. */
  className?: string;
}

interface PaperDOM {
  root: HTMLDivElement;
  inner: HTMLDivElement;
  frontFace: HTMLDivElement;
  backFace: HTMLDivElement;
  frontImg?: HTMLImageElement;
  backImg?: HTMLImageElement;
  grainOverlay?: HTMLDivElement;
  edgewearOverlay?: HTMLDivElement;
  lightOverlay?: HTMLDivElement;
  curlFlap?: HTMLDivElement;
  rotateHandle?: HTMLDivElement;
}

function calculateShadow(light: Light, lifted: boolean): string {
  const rad = (light.angle * Math.PI) / 180;
  // Light angle: 0 is top (0, -1). Clockwise: 90 is right (1, 0), etc.
  const lx = Math.sin(rad);
  const ly = -Math.cos(rad);
  // Shadow casts away from the light source
  const sx = -lx;
  const sy = -ly;
  const elev = Math.max(0.1, Math.min(1, light.elevation));
  const mult = 1.3 - elev * 0.6;

  if (lifted) {
    const x1 = Math.round(sx * 6 * mult);
    const y1 = Math.round(sy * 6 * mult);
    const x2 = Math.round(sx * 16 * mult);
    const y2 = Math.round(sy * 16 * mult);
    const x3 = Math.round(sx * 28 * mult);
    const y3 = Math.round(sy * 28 * mult);
    return `0 4px 6px rgba(0,0,0,0.06), ${x1}px ${y1}px 14px rgba(0,0,0,0.12), ${x2}px ${y2}px 32px rgba(0,0,0,0.16), ${x3}px ${y3}px 56px rgba(0,0,0,0.12)`;
  }

  const x1 = Math.round(sx * 2 * mult);
  const y1 = Math.round(sy * 2 * mult);
  const x2 = Math.round(sx * 6 * mult);
  const y2 = Math.round(sy * 6 * mult);
  const x3 = Math.round(sx * 14 * mult);
  const y3 = Math.round(sy * 14 * mult);
  return `0 1px 2px rgba(0,0,0,0.05), ${x1}px ${y1}px 6px rgba(0,0,0,0.07), ${x2}px ${y2}px 14px rgba(0,0,0,0.09), ${x3}px ${y3}px 26px rgba(0,0,0,0.11)`;
}

function calculateLightGradient(light: Light): string {
  // Angle for linear-gradient in CSS
  const deg = (light.angle + 180) % 360;
  return `linear-gradient(${deg}deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.04) 100%)`;
}

function computeClipPath(
  w: number,
  h: number,
  corner: Corner,
  amount: number,
): { clip: string; flapStyle: string } {
  const peel = Math.round(Math.min(w, h) * 0.5 * amount);
  if (peel <= 1) return { clip: 'none', flapStyle: 'display: none;' };

  let clip = '';
  let flapStyle = '';
  switch (corner) {
    case 'tl': {
      clip = `polygon(${peel}px 0, 100% 0, 100% 100%, 0 100%, 0 ${peel}px)`;
      flapStyle = `left: 0; top: 0; width: ${peel}px; height: ${peel}px; clip-path: polygon(0 0, ${peel}px 0, 0 ${peel}px); transform: rotate(180deg); transform-origin: center;`;
      break;
    }
    case 'tr': {
      clip = `polygon(0 0, calc(100% - ${peel}px) 0, 100% ${peel}px, 100% 100%, 0 100%)`;
      flapStyle = `right: 0; top: 0; width: ${peel}px; height: ${peel}px; clip-path: polygon(0 0, ${peel}px 0, ${peel}px ${peel}px); transform: rotate(180deg); transform-origin: center;`;
      break;
    }
    case 'bl': {
      clip = `polygon(0 0, 100% 0, 100% 100%, ${peel}px 100%, 0 calc(100% - ${peel}px))`;
      flapStyle = `left: 0; bottom: 0; width: ${peel}px; height: ${peel}px; clip-path: polygon(0 0, 0 ${peel}px, ${peel}px ${peel}px); transform: rotate(180deg); transform-origin: center;`;
      break;
    }
    case 'br': {
      clip = `polygon(0 0, 100% 0, 100% calc(100% - ${peel}px), calc(100% - ${peel}px) 100%, 0 100%)`;
      flapStyle = `right: 0; bottom: 0; width: ${peel}px; height: ${peel}px; clip-path: polygon(${peel}px 0, ${peel}px ${peel}px, 0 ${peel}px); transform: rotate(180deg); transform-origin: center;`;
      break;
    }
  }
  return { clip, flapStyle };
}

/**
 * Creates the default CSS 3D renderer for Paperkit.
 */
export function cssRenderer(options: CSSRendererOptions = {}): Renderer {
  let containerEl: HTMLElement | null = null;
  let surfaceEl: HTMLDivElement | null = null;
  let ctxRef: RendererContext | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let mediaQuery: MediaQueryList | null = null;
  const papersMap = new Map<string, PaperDOM>();

  const handlePointerDown = (e: PointerEvent) => {
    if (!containerEl || !ctxRef) return;
    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const captured = ctxRef.input.pointerDown({
      pointerId: e.pointerId,
      x,
      y,
      time: e.timeStamp,
      pointerType: e.pointerType,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
    if (captured) {
      try {
        containerEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignored if capture unsupported
      }
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!containerEl || !ctxRef) return;
    const rect = containerEl.getBoundingClientRect();
    ctxRef.input.pointerMove({
      pointerId: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: e.timeStamp,
      pointerType: e.pointerType,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!containerEl || !ctxRef) return;
    const rect = containerEl.getBoundingClientRect();
    ctxRef.input.pointerUp({
      pointerId: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: e.timeStamp,
      pointerType: e.pointerType,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
    try {
      if (containerEl.hasPointerCapture(e.pointerId)) {
        containerEl.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (!containerEl || !ctxRef) return;
    const rect = containerEl.getBoundingClientRect();
    ctxRef.input.pointerCancel({
      pointerId: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: e.timeStamp,
      pointerType: e.pointerType,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
    try {
      if (containerEl.hasPointerCapture(e.pointerId)) {
        containerEl.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (!containerEl || !ctxRef) return;
    const rect = containerEl.getBoundingClientRect();
    const handled = ctxRef.input.wheel({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      deltaY: e.deltaY,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
    if (handled) {
      e.preventDefault();
    }
  };

  const handleMediaChange = (e: MediaQueryListEvent) => {
    ctxRef?.setReducedMotion(e.matches);
  };

  function updateViewport(): void {
    if (!containerEl || !ctxRef) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    if (w > 0 && h > 0) {
      ctxRef.setViewport(w, h);
    }
  }

  function createPaperElement(item: RenderPaper): PaperDOM {
    const { paper } = item;
    const root = document.createElement('div');
    root.className = 'paperkit-paper';
    root.setAttribute('role', 'region');
    root.setAttribute('tabindex', '0');
    root.dataset.paperId = paper.id;

    const inner = document.createElement('div');
    inner.className = 'paperkit-paper-inner';

    // Front Face
    const frontFace = document.createElement('div');
    frontFace.className = 'paperkit-face paperkit-face-front';
    const frontImg = document.createElement('img');
    frontImg.className = 'paperkit-image';
    frontImg.draggable = false;
    frontImg.alt = '';
    frontFace.appendChild(frontImg);

    // Back Face
    const backFace = document.createElement('div');
    backFace.className = 'paperkit-face paperkit-face-back';
    let backImg: HTMLImageElement | undefined;
    if (paper.image.back) {
      backImg = document.createElement('img');
      backImg.className = 'paperkit-image';
      backImg.draggable = false;
      backImg.alt = '';
      backFace.appendChild(backImg);
    } else {
      const blank = document.createElement('div');
      blank.className = 'paperkit-face-blank';
      blank.innerHTML = '<span>Paper</span>';
      backFace.appendChild(blank);
    }

    // Textures & Overlays
    const grainOverlay = document.createElement('div');
    grainOverlay.className = 'paperkit-overlay-grain';

    const edgewearOverlay = document.createElement('div');
    edgewearOverlay.className = 'paperkit-overlay-edgewear';

    const lightOverlay = document.createElement('div');
    lightOverlay.className = 'paperkit-overlay-light';

    // Curl flap
    const curlFlap = document.createElement('div');
    curlFlap.className = 'paperkit-curl-flap';
    curlFlap.style.display = 'none';

    // Rotate handle
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'paperkit-rotate-handle';
    rotateHandle.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.6L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    `;
    rotateHandle.style.display = 'none';

    inner.appendChild(frontFace);
    inner.appendChild(backFace);
    inner.appendChild(grainOverlay);
    inner.appendChild(edgewearOverlay);
    inner.appendChild(lightOverlay);
    inner.appendChild(curlFlap);
    root.appendChild(inner);
    root.appendChild(rotateHandle);

    root.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!ctxRef) return;
      const handled = ctxRef.input.key(paper.id, e.key, {
        shift: e.shiftKey,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
      });
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    return {
      root,
      inner,
      frontFace,
      backFace,
      frontImg,
      backImg,
      grainOverlay,
      edgewearOverlay,
      lightOverlay,
      curlFlap,
      rotateHandle,
    };
  }

  return {
    mount(container: unknown, ctx: RendererContext): void {
      if (!(container instanceof HTMLElement)) {
        // Fallback for mock environments
        ctxRef = ctx;
        return;
      }

      containerEl = container;
      ctxRef = ctx;

      injectStyles();

      containerEl.classList.add('paperkit-board');
      if (options.className) {
        containerEl.classList.add(options.className);
      }

      surfaceEl = document.createElement('div');
      surfaceEl.className = 'paperkit-surface';
      containerEl.appendChild(surfaceEl);

      containerEl.addEventListener('pointerdown', handlePointerDown);
      containerEl.addEventListener('pointermove', handlePointerMove);
      containerEl.addEventListener('pointerup', handlePointerUp);
      containerEl.addEventListener('pointercancel', handlePointerCancel);
      containerEl.addEventListener('wheel', handleWheel, { passive: false });

      if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updateViewport());
        resizeObserver.observe(containerEl);
      }
      updateViewport();

      if (typeof window !== 'undefined' && window.matchMedia) {
        mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        ctx.setReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleMediaChange);
      }
    },

    render(frame: RenderFrame): void {
      if (!surfaceEl || !ctxRef) return;

      const activeIds = new Set<string>();

      // Apply reduced-motion class
      if (frame.reducedMotion) {
        containerEl?.classList.add('paperkit-reduced-motion');
      } else {
        containerEl?.classList.remove('paperkit-reduced-motion');
      }

      const lightGradient = calculateLightGradient(frame.light);

      for (const item of frame.papers) {
        const { paper, view } = item;
        activeIds.add(paper.id);

        let dom = papersMap.get(paper.id);
        if (!dom) {
          dom = createPaperElement(item);
          papersMap.set(paper.id, dom);
          surfaceEl.appendChild(dom.root);
        }

        // Accessibility label
        dom.root.setAttribute('aria-label', ctxRef.getLabel(paper));

        // Dimensioning & positioning
        const { w, h } = paper.size;
        dom.root.style.width = `${w}px`;
        dom.root.style.height = `${h}px`;
        dom.root.style.zIndex = String(paper.z);

        // Transform (center-based in core -> top-left in CSS)
        const left = paper.transform.x - w / 2;
        const top = paper.transform.y - h / 2;
        const scaleMult = view.lifted ? 1.03 : 1.0;
        const effectiveScale = paper.transform.scale * scaleMult;
        dom.root.style.transform = `translate3d(${left}px, ${top}px, 0px) rotate(${paper.transform.rotation}deg) scale(${effectiveScale})`;

        // States
        dom.root.classList.toggle('paperkit-lifted', view.lifted);
        dom.root.classList.toggle('paperkit-dragging', view.dragging);
        dom.root.classList.toggle('paperkit-flipped', paper.flipped);
        dom.root.classList.toggle('paperkit-selected', view.selected);

        // Images
        if (dom.frontImg && dom.frontImg.src !== paper.image.front.src) {
          dom.frontImg.src = paper.image.front.src;
        }
        if (paper.image.back && dom.backImg && dom.backImg.src !== paper.image.back.src) {
          dom.backImg.src = paper.image.back.src;
        }

        // Box shadow
        dom.inner.style.boxShadow = calculateShadow(frame.light, view.lifted);

        // Overlays
        if (dom.grainOverlay) {
          dom.grainOverlay.style.display = frame.texture.grain ? 'block' : 'none';
        }
        if (dom.edgewearOverlay) {
          dom.edgewearOverlay.style.display = frame.texture.edgeWear ? 'block' : 'none';
        }
        if (dom.lightOverlay) {
          dom.lightOverlay.style.backgroundImage = lightGradient;
        }

        // Curl
        if (dom.curlFlap) {
          if (view.curl && view.curl.amount > 0.005) {
            const { clip, flapStyle } = computeClipPath(w, h, view.curl.corner, view.curl.amount);
            dom.frontFace.style.clipPath = clip;
            dom.backFace.style.clipPath = clip;
            dom.curlFlap.setAttribute('style', flapStyle);
            dom.curlFlap.style.display = 'block';
          } else {
            dom.frontFace.style.clipPath = 'none';
            dom.backFace.style.clipPath = 'none';
            dom.curlFlap.style.display = 'none';
          }
        }

        // Rotate handle
        if (dom.rotateHandle) {
          if (view.selected) {
            dom.rotateHandle.style.display = 'flex';
            dom.rotateHandle.style.top = `${-frame.rotateHandleOffset / paper.transform.scale}px`;
            dom.rotateHandle.style.setProperty(
              '--handle-stem-height',
              `${frame.rotateHandleOffset / paper.transform.scale - 11}px`,
            );
          } else {
            dom.rotateHandle.style.display = 'none';
          }
        }
      }

      // Cleanup removed papers
      for (const [id, dom] of papersMap.entries()) {
        if (!activeIds.has(id)) {
          dom.root.remove();
          papersMap.delete(id);
        }
      }
    },

    unmount(): void {
      if (containerEl) {
        containerEl.removeEventListener('pointerdown', handlePointerDown);
        containerEl.removeEventListener('pointermove', handlePointerMove);
        containerEl.removeEventListener('pointerup', handlePointerUp);
        containerEl.removeEventListener('pointercancel', handlePointerCancel);
        containerEl.removeEventListener('wheel', handleWheel);
        containerEl.classList.remove('paperkit-board');
        if (options.className) {
          containerEl.classList.remove(options.className);
        }
      }
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleMediaChange);
        mediaQuery = null;
      }
      resizeObserver?.disconnect();
      resizeObserver = null;
      surfaceEl?.remove();
      surfaceEl = null;
      papersMap.clear();
      containerEl = null;
      ctxRef = null;
    },
  };
}
