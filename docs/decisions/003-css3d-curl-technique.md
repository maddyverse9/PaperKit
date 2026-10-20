# ADR 003: Pure CSS 3D Corner Curl Technique

## Context

Non-goals for v1 explicitly state "WebGL mesh page-curl (CSS-only in v1)". At the same time, Goals state "Feel physical: soft shadows, corner curl, lift on drag". Achieving an authentic tactile dog-ear curl purely in CSS without heavy WebGL mesh deformers is challenging.

## Decision

1. When a corner is curled (`amount > 0`):
   - The paper's front and back faces are clipped at the corner using dynamic CSS `clip-path: polygon(...)`.
   - A dedicated corner flap element (`.paperkit-curl-flap`) is positioned at the folded corner, rotated 180° along the fold line.
   - Realistic soft box shadows and ambient occlusion gradients are rendered underneath the fold.
2. In the core layer, an interactive gesture tracks corner drag distance and a damped spring (`stepSpring`) smoothly snaps the curl back when released.

## Consequences

- 60fps performance on low-end mobile devices and laptops without WebGL context overhead.
- True hardware-accelerated CSS 3D transforms (`translate3d`, `rotateY`, `perspective`).
- Clean separation allows plugging in a future WebGL renderer if mesh page curling is desired for v2.
