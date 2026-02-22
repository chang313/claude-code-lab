type Listener = () => void;
type CacheSetter = (value: unknown) => void;

const listeners = new Map<string, Set<Listener>>();
const cacheStore = new Map<string, unknown>();
const cacheSetters = new Map<string, Set<CacheSetter>>();

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

export function getCache<T>(key: string): T | undefined {
  return cacheStore.get(key) as T | undefined;
}

export function setCache<T>(key: string, value: T): void {
  cacheStore.set(key, value);
  cacheSetters.get(key)?.forEach((fn) => fn(value));
}

export function subscribeToCache(key: string, setter: CacheSetter): () => void {
  if (!cacheSetters.has(key)) cacheSetters.set(key, new Set());
  cacheSetters.get(key)!.add(setter);
  return () => {
    cacheSetters.get(key)!.delete(setter);
    if (cacheSetters.get(key)!.size === 0) cacheSetters.delete(key);
  };
}
