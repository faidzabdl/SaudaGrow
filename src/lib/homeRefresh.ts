// Pemancar sederhana: tab Home yang diketuk saat sudah aktif meminta layar Home me-refresh feed.
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeHomeRefresh(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitHomeRefresh(): void {
  listeners.forEach(fn => fn());
}
