/** Registra qué teclas están presionadas y cuáles se acaban de presionar. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>(); // teclas que se presionaron en este frame

  constructor() {
    window.addEventListener('keydown', (e) => {
      // Lo que se escribe en un campo de texto (el nombre) no mueve el carro.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear(); // evita teclas "pegadas" al cambiar de pestaña
      this.pressed.clear();
    });
  }

  private down(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  get throttle(): number {
    return Number(this.down('KeyW', 'ArrowUp')) - Number(this.down('KeyS', 'ArrowDown'));
  }

  get steer(): number {
    return Number(this.down('KeyA', 'ArrowLeft')) - Number(this.down('KeyD', 'ArrowRight'));
  }

  /** true solo en el frame en que se presionó la tecla (no mientras se mantiene). */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** Llamar al final de cada frame. */
  endFrame(): void {
    this.pressed.clear();
  }
}
