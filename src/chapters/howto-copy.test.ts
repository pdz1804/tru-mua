import { afterEach, describe, expect, it, vi } from 'vitest';
import { howtoSeen, markHowtoSeen } from './howto-copy';

const KEY = 'tru-mua-howto-v1';

/** A minimal in-memory localStorage; `fail` makes every call throw like a blocked or full store. */
function stubStorage(initial: Record<string, string> = {}, fail = false) {
  const data = new Map(Object.entries(initial));
  const boom = () => {
    if (fail) throw new Error('storage unavailable');
  };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (boom(), data.get(k) ?? null),
    setItem: (k: string, v: string) => (boom(), void data.set(k, v)),
    removeItem: (k: string) => (boom(), void data.delete(k)),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe('how-to seen flag', () => {
  it('is unseen until marked, then stays seen and per chapter', () => {
    const data = stubStorage();
    expect(howtoSeen('rain-0707')).toBe(false);
    markHowtoSeen('rain-0707');
    expect(howtoSeen('rain-0707')).toBe(true);
    expect(howtoSeen('rain-2507')).toBe(false);
    markHowtoSeen('rain-0707');
    expect(JSON.parse(data.get(KEY) ?? '[]')).toEqual(['rain-0707']);
  });

  it('treats garbage or non-list JSON as nothing seen and recovers on the next mark', () => {
    const data = stubStorage({ [KEY]: '{not json' });
    expect(howtoSeen('rain-0707')).toBe(false);
    markHowtoSeen('rain-0707');
    expect(howtoSeen('rain-0707')).toBe(true);
    data.set(KEY, '{"a":1}');
    expect(howtoSeen('rain-0707')).toBe(false);
    data.set(KEY, '["rain-1309",7,null]');
    expect(howtoSeen('rain-1309')).toBe(true);
  });

  it('does not throw when storage is blocked', () => {
    stubStorage({}, true);
    expect(howtoSeen('rain-0707')).toBe(false);
    expect(() => markHowtoSeen('rain-0707')).not.toThrow();
  });
});
