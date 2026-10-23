export class Progress {
  private readonly ids: string[];
  private readonly visited = new Set<string>();
  private readonly listeners = new Set<() => void>();

  constructor(ids: string[]) {
    this.ids = ids;
  }

  /** Marca la pieza como visitada. Devuelve true solo la primera vez. */
  visit(id: string): boolean {
    if (!this.ids.includes(id) || this.visited.has(id)) return false;
    this.visited.add(id);
    this.listeners.forEach((listener) => listener());
    return true;
  }

  has(id: string): boolean { return this.visited.has(id); }
  get count(): number { return this.visited.size; }
  get total(): number { return this.ids.length; }
  get missing(): number { return this.total - this.count; }
  get isComplete(): boolean { return this.count === this.total; }

  /** Avisa cada vez que cambia el progreso. Devuelve una función para cancelar. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}