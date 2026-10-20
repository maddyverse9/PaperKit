/** A minimal damped spring, integrated with semi-implicit Euler. */

/** Spring tuning. */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  /** Below this distance and velocity the spring is considered settled. */
  precision: number;
}

/** Default spring: quick, with a small overshoot (feels like paper snapping back). */
export const DEFAULT_SPRING: SpringConfig = { stiffness: 380, damping: 18, precision: 0.002 };

/** Mutable spring state. */
export interface SpringState {
  value: number;
  velocity: number;
  target: number;
}

/**
 * Advance a spring by `dtMs` milliseconds (internally sub-stepped for stability).
 * @returns `true` once the spring has settled (value snapped to target).
 */
export function stepSpring(
  s: SpringState,
  dtMs: number,
  cfg: SpringConfig = DEFAULT_SPRING,
): boolean {
  const total = Math.min(dtMs, 64) / 1000;
  const steps = Math.max(1, Math.ceil(total / (1 / 240)));
  const h = total / steps;
  for (let i = 0; i < steps; i++) {
    const force = -cfg.stiffness * (s.value - s.target) - cfg.damping * s.velocity;
    s.velocity += force * h;
    s.value += s.velocity * h;
  }
  if (Math.abs(s.value - s.target) < cfg.precision && Math.abs(s.velocity) < cfg.precision * 10) {
    s.value = s.target;
    s.velocity = 0;
    return true;
  }
  return false;
}
