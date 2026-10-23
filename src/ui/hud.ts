/** Ayuda de controles, aviso "Presiona E", panel de progreso y mensajes breves. */
export interface ProgresoItem {
  nombre: string;
  visitada: boolean;
}

export class Hud {
  private readonly prompt: HTMLDivElement;
  private readonly progress: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private readonly controls: HTMLDivElement;
  private readonly player: HTMLDivElement;
  private readonly playerName: HTMLSpanElement;
  private toastTimer = 0;

  constructor() {
    this.controls = document.createElement('div');
    this.controls.className = 'hud-controls';
    this.controls.textContent = 'W A S D o flechas: conducir   |   E: interactuar';

    this.prompt = document.createElement('div');
    this.prompt.className = 'hud-prompt hidden';

    this.progress = document.createElement('div');
    this.progress.className = 'hud-progress';

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'hud-toast hidden';

    const etiqueta = document.createElement('span');
    etiqueta.className = 'hud-player-label';
    etiqueta.textContent = 'Estudiante & Sesión';
    this.playerName = document.createElement('span');
    this.playerName.className = 'hud-player-name';
    this.player = document.createElement('div');
    this.player.className = 'hud-player';
    this.player.append(etiqueta, this.playerName);

    document.body.append(this.controls, this.prompt, this.progress, this.player, this.toastEl);
  }

  /** Muestra u oculta todo el HUD (se oculta mientras está la pantalla de inicio). */
  setVisible(visible: boolean): void {
    for (const el of [this.controls, this.progress, this.player]) el.classList.toggle('hidden', !visible);
    if (!visible) this.hidePrompt();
  }

  setPlayer(nombre: string, sesion = 'DEFAULT'): void {
    this.playerName.textContent = `${nombre} (${sesion})`;
    this.player.title = `Estudiante: ${nombre} | Sesión: ${sesion}`;
  }

  setPlayerName(nombre: string): void {
    this.playerName.textContent = nombre;
    this.player.title = nombre; // por si el nombre se corta en pantallas pequeñas
  }

  showPrompt(text: string): void {
    if (this.prompt.textContent !== text) this.prompt.textContent = text;
    this.prompt.classList.remove('hidden');
  }

  hidePrompt(): void {
    this.prompt.classList.add('hidden');
  }

  /** Dibuja el panel "Piezas 3/8" con una lista de visitadas y pendientes. */
  setProgress(items: ProgresoItem[]): void {
    const done = items.filter((i) => i.visitada).length;
    this.progress.replaceChildren();

    const title = document.createElement('div');
    title.className = 'hud-progress-title';
    title.textContent = `Piezas ${done}/${items.length}`;
    this.progress.append(title);

    const list = document.createElement('ul');
    for (const item of items) {
      const li = document.createElement('li');
      li.className = item.visitada ? 'done' : '';
      li.textContent = `${item.visitada ? '✓' : '○'} ${item.nombre}`;
      list.append(li);
    }
    this.progress.append(list);
  }

  /** Mensaje temporal en la parte superior. */
  toast(text: string, ms = 4000): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), ms);
  }
}
