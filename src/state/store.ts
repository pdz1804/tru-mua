import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Phase = 'title' | 'studio' | 'play';
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
export interface PhuLook {
  shirt: string;
  pants: string;
  hair: string;
  jacket: boolean;
}

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
  /** The rain chapter currently playing, or null. */
  chapter: string | null;
  /** Rain chapters finished at least once (their postcards). */
  chaptersDone: string[];
  doorOpen: boolean;
  sound: boolean;
  setPhase: (p: Phase) => void;
  setLead: (w: Who) => void;
  toggleLead: () => void;
  setTwoPlayer: (v: boolean) => void;
  setSu: (patch: Partial<SuLook>) => void;
  setPhu: (patch: Partial<PhuLook>) => void;
  open: (id: string) => void;
  close: () => void;
  playChapter: (id: string) => void;
  finishChapter: () => void;
  leaveChapter: () => void;
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
      chapter: null,
      chaptersDone: [],
      doorOpen: false,
      sound: false,
      setPhase: (phase) => set({ phase }),
      setLead: (lead) => set({ lead }),
      toggleLead: () => set((s) => ({ lead: s.lead === 'phu' ? 'su' : 'phu' })),
      setTwoPlayer: (twoPlayer) => set({ twoPlayer }),
      setSu: (patch) => set((s) => ({ su: { ...s.su, ...patch } })),
      setPhu: (patch) => set((s) => ({ phu: { ...s.phu, ...patch } })),
      open: (id) => set((s) => ({ active: id, seen: s.seen.includes(id) ? s.seen : [...s.seen, id] })),
      close: () => set({ active: null }),
      playChapter: (chapter) => set({ chapter }),
      finishChapter: () => set((s) => ({ chaptersDone: !s.chapter || s.chaptersDone.includes(s.chapter) ? s.chaptersDone : [...s.chaptersDone, s.chapter] })),
      leaveChapter: () => set({ chapter: null }),
      setDoorOpen: (doorOpen) => set({ doorOpen }),
      setSound: (sound) => set({ sound }),
    }),
    {
      name: 'tru-mua-v1',
      storage: createJSONStorage(() => localStorage),
      // Only the couple's choices and progress persist; transient UI state does not.
      partialize: (s) => ({ su: s.su, phu: s.phu, seen: s.seen, chaptersDone: s.chaptersDone, twoPlayer: s.twoPlayer, sound: s.sound }),
    },
  ),
);
