import { afterEach, describe, expect, it, vi } from 'vitest';
import { betterPostcard, safeStorage, type SavedPostcard } from './store';

const card = (earned: number, img: string | null = 'data:x'): SavedPostcard => ({
  id: 'c',
  date: 'd',
  title: 't',
  text: 'x',
  img,
  stamps: [0, 1, 2].map((i) => ({ label: `s${i}`, earned: i < earned })),
});

describe('postcard to keep on replay', () => {
  it('keeps the first when the replay earned fewer stamps', () => {
    const old = card(3);
    expect(betterPostcard(old, card(1))).toBe(old);
  });
  it('takes the replay when it is as good or better', () => {
    const next = card(2);
    expect(betterPostcard(card(2), next)).toBe(next);
    expect(betterPostcard(undefined, next)).toBe(next);
  });
});

describe('safe storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries without snapshots when the quota is exceeded', () => {
    const writes: string[] = [];
    vi.stubGlobal('localStorage', {
      setItem: (_k: string, v: string) => {
        if (v.includes('data:x')) throw new Error('QuotaExceededError');
        writes.push(v);
      },
    });
    safeStorage.setItem('k', JSON.stringify({ state: { postcards: [card(1)] } }));
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]).state.postcards[0].img).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const boom = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    expect(() => safeStorage.setItem('k', '{"state":{}}')).not.toThrow();
    expect(() => safeStorage.setItem('k', 'not json')).not.toThrow();
    expect(safeStorage.getItem('k')).toBeNull();
    expect(() => safeStorage.removeItem('k')).not.toThrow();
  });
});
