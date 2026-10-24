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
  private readonly healthBar: HTMLDivElement;
  private readonly healthValue: HTMLSpanElement;
  private readonly damageVignette: HTMLDivElement;
  private readonly repairOverlay: HTMLDivElement;
  private toastTimer = 0;
  private damageFlashTimer = 0;
  private repairTimer = 0;

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

    // Barra de salud verde del vehículo
    const healthCard = document.createElement('div');
    healthCard.className = 'hud-health-card';

    const healthHeader = document.createElement('div');
    healthHeader.className = 'hud-health-header';

    const healthTitle = document.createElement('span');
    healthTitle.className = 'hud-health-title';
    healthTitle.innerHTML = '🚗 Salud del Auto';

    this.healthValue = document.createElement('span');
    this.healthValue.className = 'hud-health-value';
    this.healthValue.textContent = '100%';

    healthHeader.append(healthTitle, this.healthValue);

    const healthTrack = document.createElement('div');
    healthTrack.className = 'hud-health-track';

    this.healthBar = document.createElement('div');
    this.healthBar.className = 'hud-health-bar';
    this.healthBar.style.width = '100%';

    healthTrack.appendChild(this.healthBar);
    healthCard.append(healthHeader, healthTrack);

    this.player = document.createElement('div');
    this.player.className = 'hud-player';
    this.player.append(etiqueta, this.playerName, healthCard);

    // Efectos de pantalla para choque y reparación
    this.damageVignette = document.createElement('div');
    this.damageVignette.className = 'damage-vignette';

    this.repairOverlay = document.createElement('div');
    this.repairOverlay.className = 'repair-overlay';
    this.repairOverlay.innerHTML = `
      <div style="font-size: 54px; margin-bottom: 8px;">🛠️</div>
      <div style="font-size: 26px; font-weight: 800; color: #00e676;">¡Vehículo Averiado!</div>
      <div style="font-size: 15px; opacity: 0.9; color: var(--silk);">Reparando y remolcando a la avenida central...</div>
    `;

    document.body.append(this.controls, this.prompt, this.progress, this.player, this.toastEl, this.damageVignette, this.repairOverlay);
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

  /** Actualiza la barra de salud verde del vehículo. */
  setHealth(pct: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.healthBar) {
      this.healthBar.style.width = `${clamped}%`;
    }
    if (this.healthValue) {
      this.healthValue.textContent = `${clamped}%`;
    }
  }

  /** Efecto visual de daño en pantalla y destello en la tarjeta del jugador. */
  triggerDamageFlash(): void {
    if (this.damageVignette) {
      this.damageVignette.classList.add('active');
      window.clearTimeout(this.damageFlashTimer);
      this.damageFlashTimer = window.setTimeout(() => {
        this.damageVignette.classList.remove('active');
      }, 220);
    }
    if (this.player) {
      this.player.classList.add('damage-flash');
      window.setTimeout(() => {
        this.player.classList.remove('damage-flash');
      }, 300);
    }
  }

  /** Efecto visual de recarga de salud (verde) al inspeccionar un componente. */
  triggerHealFlash(): void {
    if (this.player) {
      this.player.classList.remove('damage-flash');
      this.player.classList.add('heal-flash');
      window.setTimeout(() => {
        this.player.classList.remove('heal-flash');
      }, 600);
    }
  }

  /** Efecto visual de reparación cuando el vehículo llega a 0 HP. */
  showRepairEffect(): void {
    if (this.repairOverlay) {
      this.repairOverlay.classList.add('active');
      window.clearTimeout(this.repairTimer);
      this.repairTimer = window.setTimeout(() => {
        this.repairOverlay.classList.remove('active');
      }, 1200);
    }
  }
}
