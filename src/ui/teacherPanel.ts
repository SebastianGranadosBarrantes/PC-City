import { CloudSessionService } from '../core/cloudSession';
import { isFirebaseConfigured } from '../core/firebase';
import type { LeaderboardEntry } from '../core/leaderboard';

export interface TeacherPanelOptions {
  onSessionActive?: (code: string) => void;
}

export class TeacherPanel {
  private readonly overlay: HTMLDivElement;
  private readonly container: HTMLDivElement;
  private readonly projectorOverlay: HTMLDivElement;
  private readonly options: TeacherPanelOptions;

  private currentSessionCode = '';
  private currentPin = '1234';
  private unsubscribeProjector: (() => void) | null = null;

  constructor(options: TeacherPanelOptions = {}) {
    this.options = options;

    this.overlay = document.createElement('div');
    this.overlay.className = 'teacher-overlay hidden';

    this.container = document.createElement('div');
    this.container.className = 'teacher-card';
    this.overlay.appendChild(this.container);

    this.projectorOverlay = document.createElement('div');
    this.projectorOverlay.className = 'projector-screen hidden';

    document.body.append(this.overlay, this.projectorOverlay);
  }

  get isOpen(): boolean {
    return !this.overlay.classList.contains('hidden') || !this.projectorOverlay.classList.contains('hidden');
  }

  open(): void {
    this.overlay.classList.remove('hidden');
    this.showLogin();
  }

  close(): void {
    this.overlay.classList.add('hidden');
    this.closeProjector();
  }

  // ========================================================
  // 1. LOGIN / ACCESO DOCENTE
  // ========================================================
  private showLogin(): void {
    const online = isFirebaseConfigured();

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="coliseo-header-badge" style="margin: 0;">🎓 Panel de Administración Docente</span>
        <span class="cloud-badge ${online ? 'online' : 'simulated'}">
          ${online ? '🟢 Firestore Online' : '🟡 Modo Local/Simulado'}
        </span>
      </div>

      <h2 style="margin: 0 0 8px; font-size: 24px;">Acceso del Profesor</h2>
      <p style="margin: 0 0 20px; font-size: 14px; opacity: 0.85;">
        Crea sesiones de clase para que los estudiantes jueguen en sus propios dispositivos y compitan en vivo por el chocolate 🍫.
      </p>

      <form id="form-docente-login">
        <label for="docente-pin">Ingresa tu PIN de Docente</label>
        <input
          id="docente-pin"
          type="password"
          placeholder="Ej: 1234"
          value=""
          style="width: 100%; box-sizing: border-box; padding: 12px; border-radius: 10px; background: #06161a; color: var(--silk); border: 2px solid var(--pcb-line); font-size: 18px; margin-top: 6px;"
          required
        />
        <p id="docente-login-error" style="color: #ff9b8a; font-size: 14px; margin-top: 8px;" hidden></p>

        <div class="actions" style="margin-top: 24px;">
          <button type="submit" class="btn btn-primary">Ingresar al Panel ➔</button>
          <button type="button" id="btn-cancelar-docente" class="btn btn-secondary">Cerrar</button>
        </div>
      </form>
    `;

    this.container.querySelector('#btn-cancelar-docente')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#form-docente-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pinInput = this.container.querySelector<HTMLInputElement>('#docente-pin');
      const val = pinInput?.value.trim() || '';
      if (val.length < 3) {
        const err = this.container.querySelector<HTMLElement>('#docente-login-error');
        if (err) {
          err.textContent = 'El PIN debe tener al menos 3 dígitos.';
          err.hidden = false;
        }
        return;
      }
      this.currentPin = val;
      this.showDashboard();
    });
  }

  // ========================================================
  // 2. DASHBOARD DE SESIONES
  // ========================================================
  private showDashboard(): void {
    const online = isFirebaseConfigured();

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="coliseo-header-badge" style="margin: 0;">🎓 Gestión de Sesiones</span>
        <span class="cloud-badge ${online ? 'online' : 'simulated'}">
          ${online ? '🟢 Firestore Online' : '🟡 Modo Local/Simulado'}
        </span>
      </div>

      <h2 style="margin: 0 0 6px; font-size: 24px;">Crear o Administrar Sesión</h2>
      <p style="margin: 0 0 20px; font-size: 14px; opacity: 0.85;">
        Los estudiantes ingresarán este código al iniciar el juego para sincronizar sus puntuaciones en el coliseo.
      </p>

      <form id="form-crear-sesion" style="background: rgba(29, 74, 67, 0.25); padding: 20px; border-radius: 14px; border: 1px solid var(--pcb-line);">
        <label for="input-codigo-sesion" style="font-weight: 700; font-size: 14px;">Código de la Sesión</label>
        <div style="display: flex; gap: 10px; margin: 6px 0 16px;">
          <input
            id="input-codigo-sesion"
            type="text"
            placeholder="Ej: CLASE-101"
            value="${this.currentSessionCode || this.generateRandomCode()}"
            maxlength="15"
            style="flex: 1; padding: 12px; border-radius: 8px; background: #06161a; color: var(--gold); font-size: 18px; font-weight: 800; border: 2px solid var(--gold); text-transform: uppercase;"
            required
          />
          <button type="button" id="btn-generar-codigo" class="btn btn-secondary" title="Generar código aleatorio">
            🎲 Aleatorio
          </button>
        </div>

        <label for="input-titulo-sesion" style="font-weight: 700; font-size: 14px;">Descripción / Grupo (opcional)</label>
        <input
          id="input-titulo-sesion"
          type="text"
          placeholder="Ej: Grupo 10-A, Psicología del Aprendizaje"
          value="Grupo de Clase"
          style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; background: #06161a; color: var(--silk); font-size: 15px; border: 1px solid var(--pcb-line); margin: 6px 0 16px;"
        />

        <p id="crear-sesion-msg" style="margin: 0 0 12px; font-size: 14px;" hidden></p>

        <button type="submit" id="btn-submit-sesion" class="btn btn-primary" style="width: 100%;">
          🚀 Abrir Sesión y Habilitar Juego
        </button>
      </form>

      ${
        this.currentSessionCode
          ? `
        <div class="session-display-box">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--gold);">Sesión Activa</span>
          <div class="session-display-code">${escapeHtml(this.currentSessionCode)}</div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px;">
            <button type="button" id="btn-abrir-proyector" class="btn btn-primary">
              🖥️ Pantalla de Proyector en Vivo
            </button>
            <button type="button" id="btn-copiar-enlace" class="btn btn-secondary">
              📋 Copiar Enlace para Estudiantes
            </button>
          </div>
        </div>
      `
          : ''
      }

      <div class="actions" style="margin-top: 20px; justify-content: flex-end;">
        <button type="button" id="btn-cerrar-dashboard" class="btn btn-secondary">Cerrar</button>
      </div>
    `;

    // Generador aleatorio
    this.container.querySelector('#btn-generar-codigo')?.addEventListener('click', () => {
      const codeInput = this.container.querySelector<HTMLInputElement>('#input-codigo-sesion');
      if (codeInput) codeInput.value = this.generateRandomCode();
    });

    // Submit de creación
    this.container.querySelector('#form-crear-sesion')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = this.container.querySelector<HTMLInputElement>('#input-codigo-sesion');
      const titleInput = this.container.querySelector<HTMLInputElement>('#input-titulo-sesion');
      const msg = this.container.querySelector<HTMLElement>('#crear-sesion-msg');

      const code = (codeInput?.value || '').trim().toUpperCase();
      const title = (titleInput?.value || '').trim();

      const res = await CloudSessionService.createSession(code, this.currentPin, title);
      if (res.ok) {
        this.currentSessionCode = code;
        this.options.onSessionActive?.(code);
        this.showDashboard();
      } else if (msg) {
        msg.textContent = res.mensaje || 'Error al crear sesión.';
        msg.style.color = '#ff9b8a';
        msg.hidden = false;
      }
    });

    // Proyector
    this.container.querySelector('#btn-abrir-proyector')?.addEventListener('click', () => {
      if (this.currentSessionCode) {
        this.openProjector(this.currentSessionCode);
      }
    });

    // Copiar enlace
    this.container.querySelector('#btn-copiar-enlace')?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('session', this.currentSessionCode);
      navigator.clipboard?.writeText(url.toString());
      alert(`¡Enlace copiado al portapapeles!\n\n${url.toString()}`);
    });

    this.container.querySelector('#btn-cerrar-dashboard')?.addEventListener('click', () => {
      this.close();
    });
  }

  // ========================================================
  // 3. PANTALLA DE PROYECCIÓN EN VIVO (PARA EL AULA)
  // ========================================================
  private openProjector(code: string): void {
    this.overlay.classList.add('hidden');
    this.projectorOverlay.classList.remove('hidden');

    this.projectorOverlay.innerHTML = `
      <div class="projector-header">
        <div class="projector-title-group">
          <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); margin-bottom: 4px;">
            CIUDAD PC · PSICOLOGÍA DEL APRENDIZAJE
          </div>
          <h1>🏆 Marcador en Vivo del Coliseo</h1>
        </div>
        <div style="display: flex; gap: 14px; align-items: center;">
          <div class="projector-code-badge">
            <span style="font-size: 13px; text-transform: uppercase;">Código para unirse:</span>
            <span class="projector-code-text">${escapeHtml(code)}</span>
          </div>
          <button type="button" id="btn-salir-proyector" class="btn btn-secondary">Salir ✕</button>
        </div>
      </div>

      <div class="projector-podium" id="projector-podium">
        <!-- Renderizado dinámico del top 3 -->
      </div>

      <div class="projector-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 18px; color: var(--gold);">Clasificación General de la Clase</h3>
          <span id="projector-count" style="font-size: 14px; opacity: 0.8;">Cargando...</span>
        </div>
        <div class="table-wrapper">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>Lugar</th>
                <th>Estudiante</th>
                <th>Puntaje</th>
                <th>Aciertos</th>
                <th>Tiempo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody id="projector-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    this.projectorOverlay.querySelector('#btn-salir-proyector')?.addEventListener('click', () => {
      this.closeProjector();
      this.overlay.classList.remove('hidden');
      this.showDashboard();
    });

    // Suscripción en tiempo real a las puntuaciones
    this.unsubscribeProjector = CloudSessionService.subscribeScores(code, (scores) => {
      this.renderProjectorScores(scores);
    });
  }

  private renderProjectorScores(scores: LeaderboardEntry[]): void {
    const podiumEl = this.projectorOverlay.querySelector('#projector-podium');
    const tbody = this.projectorOverlay.querySelector('#projector-table-body');
    const countEl = this.projectorOverlay.querySelector('#projector-count');

    if (countEl) countEl.textContent = `${scores.length} participantes registrados`;

    // Podio Top 3
    if (podiumEl) {
      const first = scores[0];
      const second = scores[1];
      const third = scores[2];

      podiumEl.innerHTML = `
        <div class="podium-slot rank-2">
          <div class="podium-medal">🥈</div>
          <div class="podium-name">${second ? escapeHtml(second.nombre) : '—'}</div>
          <div class="podium-points">${second ? second.puntos.toLocaleString() : '0'} pts</div>
          <div style="font-size: 12px; opacity: 0.75;">2.º Lugar</div>
        </div>

        <div class="podium-slot rank-1">
          <div class="podium-medal">🍫 👑</div>
          <div class="podium-name" style="font-size: 22px; color: #ffd700;">${first ? escapeHtml(first.nombre) : 'Esperando...'}</div>
          <div class="podium-points" style="font-size: 28px;">${first ? first.puntos.toLocaleString() : '0'} pts</div>
          <div style="font-size: 14px; font-weight: 700; color: #f7c58c; margin-top: 4px;">¡LÍDER DEL CHOCOLATE! 🍫</div>
        </div>

        <div class="podium-slot rank-3">
          <div class="podium-medal">🥉</div>
          <div class="podium-name">${third ? escapeHtml(third.nombre) : '—'}</div>
          <div class="podium-points">${third ? third.puntos.toLocaleString() : '0'} pts</div>
          <div style="font-size: 12px; opacity: 0.75;">3.er Lugar</div>
        </div>
      `;
    }

    // Tabla completa
    if (tbody) {
      if (scores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 28px; opacity: 0.7;">Esperando a que los estudiantes completen el desafío en el Coliseo...</td></tr>`;
      } else {
        tbody.innerHTML = scores
          .map((item, idx) => {
            let rankHtml = `${idx + 1}`;
            if (idx === 0) rankHtml = `<span class="rank-badge rank-1">👑 1 🍫</span>`;
            else if (idx === 1) rankHtml = `<span class="rank-badge rank-2">🥈 2</span>`;
            else if (idx === 2) rankHtml = `<span class="rank-badge rank-3">🥉 3</span>`;

            return `
              <tr class="${idx === 0 ? 'top-leader' : ''}">
                <td>${rankHtml}</td>
                <td style="font-weight: 700;">${escapeHtml(item.nombre)}</td>
                <td style="font-weight: 800; color: var(--gold);">${item.puntos.toLocaleString()}</td>
                <td>${item.aciertos}/${item.totalPreguntas}</td>
                <td>${item.tiempoTotal}s</td>
                <td style="opacity: 0.75; font-size: 12px;">${item.fecha}</td>
              </tr>
            `;
          })
          .join('');
      }
    }
  }

  private closeProjector(): void {
    if (this.unsubscribeProjector) {
      this.unsubscribeProjector();
      this.unsubscribeProjector = null;
    }
    this.projectorOverlay.classList.add('hidden');
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PC-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
