type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(key: string, listener: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => {
    listeners.get(key)!.delete(listener);
    if (listeners.get(key)!.size === 0) listeners.delete(key);
  };
}

export function invalidate(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function invalidateByPrefix(prefix: string) {
  for (const [key, set] of listeners) {
    if (key.startsWith(prefix)) set.forEach((fn) => fn());
  }
}

export function invalidateAll() {
  listeners.forEach((set) => set.forEach((fn) => fn()));
}
