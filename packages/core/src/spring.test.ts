import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRING, stepSpring, type SpringState } from './spring.js';

describe('spring', () => {
  it('converges to target value', () => {
    const s: SpringState = { value: 1, velocity: 0, target: 0 };
    let settled = false;
    for (let i = 0; i < 200; i++) {
      settled = stepSpring(s, 16, DEFAULT_SPRING);
      if (settled) break;
    }
    expect(settled).toBe(true);
    expect(s.value).toBe(0);
    expect(s.velocity).toBe(0);
  });
});
