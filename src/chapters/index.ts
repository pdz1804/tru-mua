import type { Level } from './engine/runtime';
import { CHAPTER_META } from './catalog';
import { Chapter0707 } from './levels/c0707';
import { Chapter2507 } from './levels/c2507';
import { Chapter1309 } from './levels/c1309';

export type { ChapterId } from './catalog';

/** The three rain chapters, in date order. Each call to `make` returns a fresh level with clean state. */
export const CHAPTER_INFO = [
  { ...CHAPTER_META[0], make: (): Level => new Chapter0707() },
  { ...CHAPTER_META[1], make: (): Level => new Chapter2507() },
  { ...CHAPTER_META[2], make: (): Level => new Chapter1309() },
] as const;

export const chapterInfo = (id: string) => CHAPTER_INFO.find((c) => c.id === id);
