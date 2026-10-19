import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Phase = 'title' | 'studio' | 'play' | 'chapter';
export type Who = 'phu' | 'su';

/** Colour swatches come straight from what Su said she likes (pink, white, pale yellow, baby blue light & dark). */
export const SU_DRESS = ['#7fb3ea', '#2f5f9e', '#f6c9d8', '#fbfbf6', '#f6e5a0'] as const;
export const PHU_SHIRT = ['#efe2c4', '#1f2026', '#f3e7a8', '#ffffff', '#9cc3e6'] as const;
export const HAIR = ['#2b1b17', '#4a2f22', '#6b4632'] as const;

export interface SuLook {
  dress: string;
  hair: string;
  bow: boolean;
  necklace: boolean;
  longHair: boolean;
}
/** A finished rain chapter: the in-game snapshot (small JPEG data URL) and the stamps earned. */
export interface SavedPostcard {
  id: string;
  date: string;
  title: string;
  text: string;
  img: string | null;
  stamps: { label: string; earned: boolean }[];
}

export interface PhuLook {
  shirt: string;
  pants: string;
  hair: string;
  jacket: boolean;
}

/**
 * localStorage that never throws: Safari private mode and a full origin make setItem fail. A failed
 * write is retried once without the postcard snapshots (the big part); if that fails too, progress
 * simply is not saved this time.
 */
export const safeStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      try {
        const o = JSON.parse(v) as { state?: { postcards?: { img?: string | null }[] } };
        o.state?.postcards?.forEach((p) => (p.img = null));
        localStorage.setItem(k, JSON.stringify(o));
      } catch {
        /* storage unavailable: keep playing without saving */
      }
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

/** Which of two postcards of one chapter to keep: the one with more stamps; a tie goes to the newer. */
export const betterPostcard = (old: SavedPostcard | undefined, next: SavedPostcard) =>
  old && old.stamps.filter((x) => x.earned).length > next.stamps.filter((x) => x.earned).length ? old : next;

interface State {
  phase: Phase;
  lead: Who;
  twoPlayer: boolean;
  su: SuLook;
  phu: PhuLook;
  /** Memory ids the couple has already opened, in order. */
  seen: string[];
  /** The memory card currently on screen, or null. */
  active: string | null;
  doorOpen: boolean;
  sound: boolean;
  /** The rain chapter being played (phase 'chapter'), or null. */
  chapter: string | null;
  /** The last chapter played this session; the room spawns the couple in front of its frame. */
  lastChapter: string | null;
  /** One postcard per chapter, newest kept. */
  postcards: SavedPostcard[];
  playChapter: (id: string) => void;
  savePostcard: (p: SavedPostcard) => void;
  backToRoom: () => void;
  setPhase: (p: Phase) => void;
  setLead: (w: Who) => void;
  toggleLead: () => void;
  setTwoPlayer: (v: boolean) => void;
  setSu: (patch: Partial<SuLook>) => void;
  setPhu: (patch: Partial<PhuLook>) => void;
  open: (id: string) => void;
  close: () => void;
  setDoorOpen: (v: boolean) => void;
  setSound: (v: boolean) => void;
}

export const useGame = create<State>()(
  persist(
    (set) => ({
      phase: 'title',
      lead: 'phu',
      twoPlayer: false,
      su: { dress: SU_DRESS[0], hair: HAIR[0], bow: true, necklace: true, longHair: true },
      phu: { shirt: PHU_SHIRT[0], pants: '#23252e', hair: HAIR[0], jacket: true },
      seen: [],
      active: null,
      doorOpen: false,
      sound: false,
      chapter: null,
      lastChapter: null,
      postcards: [],
      playChapter: (chapter) => set({ chapter, lastChapter: chapter, phase: 'chapter', active: null }),
      savePostcard: (p) =>
        set((s) => ({
          postcards: [
            betterPostcard(
              s.postcards.find((x) => x.id === p.id),
              p,
            ),
            ...s.postcards.filter((x) => x.id !== p.id),
          ],
        })),
      // back in the café, already inside (the door is open)
      backToRoom: () => set({ chapter: null, phase: 'play', doorOpen: true }),
      setPhase: (phase) => set({ phase }),
      setLead: (lead) => set({ lead }),
      toggleLead: () => set((s) => ({ lead: s.lead === 'phu' ? 'su' : 'phu' })),
      setTwoPlayer: (twoPlayer) => set({ twoPlayer }),
      setSu: (patch) => set((s) => ({ su: { ...s.su, ...patch } })),
      setPhu: (patch) => set((s) => ({ phu: { ...s.phu, ...patch } })),
      open: (id) => set((s) => ({ active: id, seen: s.seen.includes(id) ? s.seen : [...s.seen, id] })),
      close: () => set({ active: null }),
      setDoorOpen: (doorOpen) => set({ doorOpen }),
      setSound: (sound) => set({ sound }),
    }),
    {
      name: 'tru-mua-v1',
      storage: createJSONStorage(() => safeStorage),
      // Only the couple's choices and progress persist; transient UI state does not.
      partialize: (s) => ({ su: s.su, phu: s.phu, seen: s.seen, postcards: s.postcards, twoPlayer: s.twoPlayer, sound: s.sound }),
    },
  ),
);
