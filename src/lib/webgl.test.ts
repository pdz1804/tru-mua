import { describe, expect, it } from 'vitest';
import { hasWebGL } from './webgl';

const canvasWith = (ok: string[]) => () => ({ getContext: (id: string) => (ok.includes(id) ? {} : null) });

describe('hasWebGL', () => {
  it('accepts webgl2', () => expect(hasWebGL(canvasWith(['webgl2']))).toBe(true));
  it('falls back to webgl1', () => expect(hasWebGL(canvasWith(['webgl']))).toBe(true));
  it('is false when no context can be made', () => expect(hasWebGL(canvasWith([]))).toBe(false));
  it('is false when the probe itself throws', () =>
    expect(
      hasWebGL(() => {
        throw new Error('no DOM');
      }),
    ).toBe(false));
});
