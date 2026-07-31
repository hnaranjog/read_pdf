/**
 * Caché LRU mínima para canvases renderizados.
 * Al expulsar una entrada libera la memoria gráfica del canvas.
 */
export class LruCache<V> {
  private readonly map = new Map<string, V>();

  constructor(
    private readonly maxSize: number,
    private readonly onEvict?: (value: V) => void,
  ) {}

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // reinsertar al final = más recientemente usado
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        const evicted = this.map.get(oldestKey);
        this.map.delete(oldestKey);
        if (evicted !== undefined) this.onEvict?.(evicted);
      }
    }
  }

  deleteByPrefix(prefix: string): void {
    for (const [key, value] of this.map) {
      if (key.startsWith(prefix)) {
        this.map.delete(key);
        this.onEvict?.(value);
      }
    }
  }

  clear(): void {
    for (const value of this.map.values()) this.onEvict?.(value);
    this.map.clear();
  }
}
