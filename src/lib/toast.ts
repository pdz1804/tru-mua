/** Tiny event bus so world code (outside React) can show a short message in the HUD. */
type Fn = (msg: string) => void;
const subs = new Set<Fn>();

export const toastBus = {
  emit(msg: string) {
    subs.forEach((f) => f(msg));
  },
  on(f: Fn) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};
