import { describe, expect, it } from 'vitest';
import { nearest, type Interactable } from './interactions';
import { cameraRelative, angleDelta, damp } from '../lib/math';
import { MEMORIES } from '../content/memories';
import { CHAPTERS, isChoice } from '../content/chapters';

const mk = (id: string, x: number, z: number, radius = 1.5): Interactable => ({ id, x, z, radius, prompt: id, onUse: () => {} });

describe('nearest interactable', () => {
  it('returns null when nothing is in range', () => {
    expect(nearest([mk('a', 5, 5)], 0, 0)).toBeNull();
  });
  it('picks the closest of several in range', () => {
    expect(nearest([mk('far', 1.2, 0), mk('near', 0.4, 0)], 0, 0)?.id).toBe('near');
  });
  it('respects each item radius', () => {
    expect(nearest([mk('small', 1, 0, 0.5)], 0, 0)).toBeNull();
  });
});

describe('camera-relative movement', () => {
  it('forward stays forward when the camera looks down -z', () => {
    const v = cameraRelative(0, -1, 0);
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-1);
  });
  it('rotates with the camera yaw', () => {
    const v = cameraRelative(0, -1, Math.PI / 2);
    expect(v.x).toBeCloseTo(-1);
    expect(v.z).toBeCloseTo(0);
  });
});

describe('math helpers', () => {
  it('angleDelta takes the short way round', () => {
    expect(angleDelta(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
  });
  it('damp is frame-rate independent', () => {
    const one = damp(5, 0.02);
    const two = 1 - (1 - damp(5, 0.01)) ** 2;
    expect(one).toBeCloseTo(two, 10);
  });
});

describe('rain chapters', () => {
  it('each has exactly one choice, and every option replies', () => {
    CHAPTERS.forEach((c) => {
      const choices = c.beats.filter(isChoice);
      expect(choices).toHaveLength(1);
      choices[0].options.forEach((o) => expect(o.reply.length).toBeGreaterThan(0));
    });
  });
  it('never contains private contact data', () => {
    const all = JSON.stringify(CHAPTERS);
    expect(all).not.toMatch(/\d{9,}/);
    expect(all).not.toMatch(/\d+\/\d+\/\d+ /);
  });
});

describe('memory content', () => {
  it('has unique ids and non-empty notes', () => {
    const ids = new Set(MEMORIES.map((m) => m.id));
    expect(ids.size).toBe(MEMORIES.length);
    MEMORIES.forEach((m) => expect(m.body.length).toBeGreaterThan(0));
  });
  it('never contains private contact data', () => {
    const all = JSON.stringify(MEMORIES);
    expect(all).not.toMatch(/\d{9,}/); // phone-like digit runs
    expect(all).not.toMatch(/\d+\/\d+\/\d+ /); // house-number style addresses
  });
});
