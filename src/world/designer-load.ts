import { useSyncExternalStore } from 'react';

/**
 * Whether each designer .glb can be fetched, decided once per file for the whole session. A model that is known to be
 * missing never mounts a loader, so a failed file is tried once, warned about once, and the code-built prop stays.
 */
export type DesignerStatus = 'pending' | 'ready' | 'failed';

const status = new Map<string, DesignerStatus>();
const subs = new Set<() => void>();

function set(url: string, next: DesignerStatus) {
  status.set(url, next);
  subs.forEach((fn) => fn());
}

/** Marks a file as failed (once) and says so on the console (once). */
export function failDesigner(url: string, err?: unknown) {
  if (status.get(url) === 'failed') return;
  console.warn(`designer model ${url} failed to load, keeping the code-built prop`, err);
  set(url, 'failed');
}

function probe(url: string) {
  status.set(url, 'pending');
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // the body is read by the real loader next; here only the answer matters
      void r.body?.cancel();
      set(url, 'ready');
    })
    .catch((err) => failDesigner(url, err));
}

const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => void subs.delete(fn);
};

/** The load state of one designer model; the first caller starts the check. */
export function useDesignerStatus(url: string): DesignerStatus {
  if (!status.has(url)) probe(url);
  return useSyncExternalStore(
    subscribe,
    () => status.get(url) ?? 'pending',
    () => 'pending',
  );
}
