import preguntasJson from '../data/preguntas.json';
import piezasJson from '../data/piezas.json';
import { CloudSessionService } from '../core/cloudSession';

export interface PreguntaData {
  id: string;
  piezaId: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  tiempoSegundos: number;
}

export interface ColiseoQuizOptions {
  onClose?: () => void;
}

const SHAPES = [
  { shape: '▲', colorClass: 'card-red', key: '1' },
  { shape: '◆', colorClass: 'card-blue', key: '2' },
  { shape: '●', colorClass: 'card-yellow', key: '3' },
  { shape: '■', colorClass: 'card-green', key: '4' },
];

export class ColiseoQuiz {
  private readonly overlay: HTMLDivElement;
  private readonly container: HTMLDivElement;
  private preguntas: PreguntaData[] = [];
  private readonly options: ColiseoQuizOptions;

  private playerName = 'Estudiante';
  private sessionCode = 'DEFAULT';
  private currentQuestion = 0;
  private score = 0;
  private streak = 0;
  private correctCount = 0;
  private quizStartTime = 0;

  // Temporizador
  private timerId: number | null = null;
  private questionStartTime = 0;
  private questionDuration = 15;
  private questionActive = false;

  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: ColiseoQuizOptions = {}) {
    this.options = options;
    this.preguntas = this.pickQuestions();

    this.overlay = document.createElement('div');
    this.overlay.className = 'coliseo-overlay hidden';

    this.container = document.createElement('div');
    this.container.className = 'coliseo-container';
    this.overlay.appendChild(this.container);

    document.body.appendChild(this.overlay);
  }

  /**
   * Selecciona aleatoriamente 1 pregunta por cada componente (de entre sus opciones disponibles),
   * asegurando que cada estudiante tenga una evaluación variada con cobertura completa de las 9 piezas.
   */
  private pickQuestions(): PreguntaData[] {
    const porComponente = new Map<string, PreguntaData[]>();
    for (const q of preguntasJson as PreguntaData[]) {
      const list = porComponente.get(q.piezaId) ?? [];
      list.push(q);
      porComponente.set(q.piezaId, list);
    }

    const seleccionadas: PreguntaData[] = [];
    for (const [, pool] of porComponente) {
      if (pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        seleccionadas.push(pool[randomIndex]);
      }
    }
    return seleccionadas;
  }

  get isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  hasCompleted(nombre = this.playerName, sessionCode = this.sessionCode): boolean {
    const cleanName = (nombre || '').trim().toLowerCase();
    const cleanSession = (sessionCode || '').trim().toUpperCase();
    if (!cleanName || !cleanSession) return false;
    try {
      return localStorage.getItem(`pc_city_completed_${cleanSession}_${cleanName}`) === 'true';
    } catch {
      return false;
    }
  }

  private markCompleted(nombre: string, sessionCode: string): void {
    const cleanName = (nombre || '').trim().toLowerCase();
    const cleanSession = (sessionCode || '').trim().toUpperCase();
    if (!cleanName || !cleanSession) return;
    try {
      localStorage.setItem(`pc_city_completed_${cleanSession}_${cleanName}`, 'true');
    } catch (e) {
      console.warn('Error al guardar estado de quiz completado:', e);
    }
  }

  open(nombre: string, sessionCode = 'DEFAULT'): void {
    this.playerName = nombre.trim() || 'Estudiante';
    this.sessionCode = sessionCode.trim().toUpperCase() || 'DEFAULT';
    this.overlay.classList.remove('hidden');

    // Si el jugador ya completó el quiz en esta sesión, solo ve la tabla de posiciones
    if (this.hasCompleted(this.playerName, this.sessionCode)) {
      this.showLeaderboardView(this.sessionCode);
    } else {
      this.showWelcome();
    }
  }

  close(): void {
    this.stopTimer();
    this.detachKeyListener();
    this.overlay.classList.add('hidden');
    this.options.onClose?.();
  }

  // ========================================================
  // PANTALLA 1: BIENVENIDA / LOBBY
  // ========================================================
  private async showWelcome(): Promise<void> {
    this.stopTimer();
    this.detachKeyListener();

    if (this.hasCompleted(this.playerName, this.sessionCode)) {
      this.showLeaderboardView(this.sessionCode);
      return;
    }

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div class="coliseo-header-badge" style="margin: 0;">🏛️ Coliseo de Ciudad PC</div>
        <div class="quiz-badge">Sesión: <span style="color: var(--gold);">${escapeHtml(this.sessionCode)}</span></div>
      </div>

      <h1 class="coliseo-title">¡Desafío de Conocimiento!</h1>
      <p class="coliseo-lead">
        ¡Excelente trabajo, <strong>${escapeHtml(this.playerName)}</strong>! Has explorado las 9 piezas de la ciudad.
        Ahora pon a prueba tu memoria y velocidad en este desafío estilo Kahoot.
      </p>

      <div class="chocolate-banner">
        <div class="chocolate-icon">🍫</div>
        <div class="chocolate-info">
          <h4>¡Premio de la Sesión: El Gran Chocolate!</h4>
          <p>
            Cada pregunta correcta otorga hasta <strong>1,000 puntos</strong> según tu rapidez.
            ¡El estudiante que lidere la sesión <strong>${escapeHtml(this.sessionCode)}</strong> al final de la clase se lleva el chocolate!
          </p>
          <div id="welcome-leader-slot" style="margin-top: 6px; font-weight: 700; color: #ffd700;">
            Cargando líder actual…
          </div>
        </div>
      </div>

      <div class="actions" style="margin-top: 10px;">
        <button type="button" id="btn-comenzar-quiz" class="btn btn-primary">¡Comenzar Desafío! 🚀</button>
        <button type="button" id="btn-ver-tabla" class="btn btn-secondary">Ver Tabla de la Sesión 🏆</button>
        <button type="button" id="btn-salir-coliseo" class="btn btn-secondary">Volver a la Ciudad</button>
      </div>
    `;

    // Cargar líder de la sesión en segundo plano
    CloudSessionService.getScores(this.sessionCode).then((scores) => {
      const slot = this.container.querySelector('#welcome-leader-slot');
      if (slot) {
        if (scores.length > 0) {
          const leader = scores[0];
          slot.innerHTML = `👑 Dueño actual del chocolate: <strong>${escapeHtml(leader.nombre)}</strong> (${leader.puntos.toLocaleString()} pts)`;
        } else {
          slot.innerHTML = `¡Aún no hay puntuaciones en esta sesión, sé el primero en establecer récord!`;
        }
      }
    });

    this.container.querySelector('#btn-comenzar-quiz')?.addEventListener('click', () => {
      this.startQuiz();
    });

    this.container.querySelector('#btn-ver-tabla')?.addEventListener('click', () => {
      this.showLeaderboardView();
    });

    this.container.querySelector('#btn-salir-coliseo')?.addEventListener('click', () => {
      this.close();
    });
  }

  // ========================================================
  // PANTALLA 2: PREGUNTA ACTIVA
  // ========================================================
  private startQuiz(): void {
    // Al comenzar, seleccionamos una pregunta aleatoria de cada componente
    this.preguntas = this.pickQuestions();
    this.currentQuestion = 0;
    this.score = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.quizStartTime = performance.now();
    this.renderQuestion(0);
  }

  private renderQuestion(index: number): void {
    if (index >= this.preguntas.length) {
      this.showResults();
      return;
    }

    this.currentQuestion = index;
    const q = this.preguntas[index];
    this.questionDuration = q.tiempoSegundos || 15;
    this.questionActive = true;

    const pieza = (piezasJson as { id: string; nombre: string }[]).find((p) => p.id === q.piezaId);
    const piezaNombre = pieza ? pieza.nombre : q.piezaId;

    this.container.innerHTML = `
      <div class="quiz-top-bar">
        <div class="quiz-badge">Pregunta ${index + 1} de ${this.preguntas.length} • <span style="color: var(--gold);">${escapeHtml(piezaNombre)}</span></div>
        <div class="quiz-score-badge">Puntos: <span id="quiz-score-num">${this.score.toLocaleString()}</span></div>
        ${this.streak > 1 ? `<div class="quiz-streak-badge">🔥 Racha x${this.streak}</div>` : ''}
      </div>

      <div class="timer-container">
        <div class="timer-track">
          <div class="timer-fill" id="timer-bar"></div>
        </div>
        <div class="timer-text" id="timer-seconds">${this.questionDuration}s</div>
      </div>

      <div class="quiz-question-box">
        <h2 class="quiz-question-text">${escapeHtml(q.pregunta)}</h2>
      </div>

      <div class="quiz-options-grid" id="options-grid">
        ${q.opciones
          .map(
            (op, i) => `
          <button type="button" class="kahoot-card ${SHAPES[i].colorClass}" data-index="${i}">
            <span class="card-shape">${SHAPES[i].shape}</span>
            <span class="card-text">${escapeHtml(op)}</span>
            <span class="card-key">[${SHAPES[i].key}]</span>
          </button>
        `,
          )
          .join('')}
      </div>

      <div id="feedback-area"></div>
    `;

    // Conectar botones
    const cards = this.container.querySelectorAll<HTMLButtonElement>('.kahoot-card');
    cards.forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.dataset.index ?? '-1', 10);
        if (this.questionActive && selected >= 0) {
          this.handleAnswer(selected);
        }
      });
    });

    // Teclas 1, 2, 3, 4
    this.attachKeyListener((key) => {
      if (!this.questionActive) return;
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 4) {
        this.handleAnswer(num - 1);
      }
    });

    // Iniciar reloj
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.questionStartTime = performance.now();
    const bar = this.container.querySelector<HTMLDivElement>('#timer-bar');
    const label = this.container.querySelector<HTMLDivElement>('#timer-seconds');

    const update = () => {
      const elapsed = (performance.now() - this.questionStartTime) / 1000;
      const remaining = Math.max(0, this.questionDuration - elapsed);
      const pct = Math.max(0, Math.min(100, (remaining / this.questionDuration) * 100));

      if (bar) {
        bar.style.width = `${pct}%`;
        bar.classList.toggle('warning', remaining <= 6 && remaining > 3);
        bar.classList.toggle('danger', remaining <= 3);
      }
      if (label) {
        label.textContent = `${Math.ceil(remaining)}s`;
      }

      if (remaining <= 0) {
        this.stopTimer();
        this.handleAnswer(-1); // Tiempo agotado
      } else {
        this.timerId = window.requestAnimationFrame(update);
      }
    };

    this.timerId = window.requestAnimationFrame(update);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      window.cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  private attachKeyListener(handler: (key: string) => void): void {
    this.detachKeyListener();
    this.keyListener = (e: KeyboardEvent) => {
      handler(e.key);
    };
    window.addEventListener('keydown', this.keyListener);
  }

  private detachKeyListener(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
  }

  // ========================================================
  // EVALUACIÓN DE RESPUESTA Y FEEDBACK
  // ========================================================
  private handleAnswer(selectedIndex: number): void {
    if (!this.questionActive) return;
    this.questionActive = false;
    this.stopTimer();
    this.detachKeyListener();

    const q = this.preguntas[this.currentQuestion];
    const isCorrect = selectedIndex === q.correcta;
    const elapsed = (performance.now() - this.questionStartTime) / 1000;
    const timeRemaining = Math.max(0, this.questionDuration - elapsed);

    let earned = 0;
    if (isCorrect) {
      const factorTiempo = Math.max(0, Math.min(1, timeRemaining / this.questionDuration));
      earned = Math.round(500 + 500 * factorTiempo);
      if (this.streak >= 1) {
        earned += Math.min(this.streak * 50, 200);
      }
      this.streak++;
      this.correctCount++;
      this.score += earned;
    } else {
      this.streak = 0;
    }

    const cards = this.container.querySelectorAll<HTMLButtonElement>('.kahoot-card');
    cards.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correcta) {
        btn.classList.add('is-correct');
      } else {
        btn.classList.add('is-wrong');
      }
    });

    const feedbackArea = this.container.querySelector('#feedback-area');
    if (feedbackArea) {
      const isTimeout = selectedIndex === -1;
      feedbackArea.innerHTML = `
        <div class="quiz-feedback-box ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="quiz-feedback-header">
            <div class="quiz-feedback-verdict">
              ${isCorrect ? '¡CORRECTO! 🎉' : isTimeout ? '¡TIEMPO AGOTADO! ⏰' : '¡INCORRECTO! ❌'}
            </div>
            <div class="quiz-feedback-pts">
              ${isCorrect ? `+${earned.toLocaleString()} pts` : '+0 pts'}
            </div>
          </div>
          <p class="quiz-feedback-explanation">
            <strong>Explicación:</strong> ${escapeHtml(q.explicacion)}
          </p>
          <button type="button" id="btn-next-question" class="btn btn-primary" style="width: 100%;">
            ${this.currentQuestion + 1 < this.preguntas.length ? 'Siguiente Pregunta ➔' : 'Guardar y Ver Resultados 🏆'}
          </button>
        </div>
      `;

      const nextBtn = feedbackArea.querySelector<HTMLButtonElement>('#btn-next-question');
      nextBtn?.focus();
      nextBtn?.addEventListener('click', () => {
        this.renderQuestion(this.currentQuestion + 1);
      });

      this.attachKeyListener((key) => {
        if (key === 'Enter' || key === ' ') {
          this.renderQuestion(this.currentQuestion + 1);
        }
      });
    }
  }

  // ========================================================
  // PANTALLA 3: RESULTADOS FINALES Y TABLA EN LA NUBE
  // ========================================================
  private async showResults(): Promise<void> {
    this.stopTimer();
    this.detachKeyListener();

    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div class="chocolate-icon" style="font-size: 54px; margin-bottom: 16px;">⏳</div>
        <h2>Guardando tu puntuación en la nube…</h2>
        <p style="opacity: 0.8;">Sincronizando con la sesión <strong>${escapeHtml(this.sessionCode)}</strong></p>
      </div>
    `;

    const elapsedTotal = (performance.now() - this.quizStartTime) / 1000;
    const { entry, rank, isLeader } = await CloudSessionService.submitScore(this.sessionCode, {
      nombre: this.playerName,
      puntos: this.score,
      aciertos: this.correctCount,
      totalPreguntas: this.preguntas.length,
      tiempoTotal: elapsedTotal,
    });

    // Marcar como completado para que el jugador no pueda volver a intentar el quiz
    this.markCompleted(this.playerName, this.sessionCode);

    const allEntries = await CloudSessionService.getScores(this.sessionCode);
    const leader = allEntries[0];

    this.container.innerHTML = `
      <div class="results-hero">
        <div class="results-trophy">${isLeader ? '🍫' : rank <= 3 ? '🏆' : '🎯'}</div>
        <h1 class="results-title">${isLeader ? '¡ERES EL GANADOR DEL CHOCOLATE! 🍫' : '¡Desafío Completado!'}</h1>
        <p class="results-subtitle">
          ${
            isLeader
              ? `¡Increíble, <strong>${escapeHtml(
                  this.playerName,
                )}</strong>! Tienes el 1.er lugar en la sesión <strong>${escapeHtml(this.sessionCode)}</strong>. ¡El chocolate es tuyo!`
              : `Bien jugado, <strong>${escapeHtml(
                  this.playerName,
                )}</strong>. Lograste el puesto <strong>#${rank}</strong> en la sesión <strong>${escapeHtml(this.sessionCode)}</strong>.`
          }
        </p>

        <div class="results-stats-row">
          <div class="stat-pill">
            <span class="stat-label">Puntaje Final</span>
            <span class="stat-value" style="color: var(--gold);">${this.score.toLocaleString()}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Aciertos</span>
            <span class="stat-value">${this.correctCount} / ${this.preguntas.length}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Tiempo Total</span>
            <span class="stat-value">${Math.round(elapsedTotal)}s</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Posición</span>
            <span class="stat-value">${isLeader ? '🥇 #1' : `#${rank}`}</span>
          </div>
        </div>

        ${
          !isLeader && leader
            ? `
          <div class="winner-callout">
            <span>🍫 Líder del chocolate: <strong>${escapeHtml(leader.nombre)}</strong> con <strong>${leader.puntos.toLocaleString()} pts</strong></span>
          </div>`
            : ''
        }
      </div>

      <div class="leaderboard-section">
        <div class="leaderboard-title">
          <span>Clasificación de la Sesión [${escapeHtml(this.sessionCode)}]</span>
          <span style="font-size: 13px; font-weight: normal; opacity: 0.8;">${allEntries.length} participantes</span>
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
            <tbody>
              ${allEntries
                .slice(0, 10)
                .map((item, idx) => {
                  const esTop = idx === 0;
                  const esActual = item.id === entry.id || (item.nombre === entry.nombre && item.puntos === entry.puntos);
                  let rankHtml = `${idx + 1}`;
                  if (idx === 0) rankHtml = `<span class="rank-badge rank-1">👑 1 🍫</span>`;
                  else if (idx === 1) rankHtml = `<span class="rank-badge rank-2">🥈 2</span>`;
                  else if (idx === 2) rankHtml = `<span class="rank-badge rank-3">🥉 3</span>`;

                  return `
                  <tr class="${esTop ? 'top-leader' : ''} ${esActual ? 'highlight-current' : ''}">
                    <td>${rankHtml}</td>
                    <td>${escapeHtml(item.nombre)} ${esActual ? '<em>(Tú)</em>' : ''}</td>
                    <td style="font-weight: 700; color: var(--gold);">${item.puntos.toLocaleString()}</td>
                    <td>${item.aciertos}/${item.totalPreguntas}</td>
                    <td>${item.tiempoTotal}s</td>
                    <td style="opacity: 0.75; font-size: 12px;">${item.fecha}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="actions" style="justify-content: center;">
        <button type="button" id="btn-volver-ciudad" class="btn btn-primary" style="min-width: 220px;">Volver a la Ciudad 🚗</button>
      </div>
    `;

    this.container.querySelector('#btn-volver-ciudad')?.addEventListener('click', () => {
      this.close();
    });
  }

  // ========================================================
  // PANTALLA 4: TABLA DE POSICIONES INDEPENDIENTE
  // ========================================================
  async showLeaderboardView(sessionCode = this.sessionCode): Promise<void> {
    this.stopTimer();
    this.detachKeyListener();
    this.sessionCode = sessionCode.trim().toUpperCase() || 'DEFAULT';

    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div class="chocolate-icon" style="font-size: 54px; margin-bottom: 16px;">⏳</div>
        <h2>Cargando tabla de la sesión ${escapeHtml(this.sessionCode)}…</h2>
      </div>
    `;
    this.overlay.classList.remove('hidden');

    const allEntries = await CloudSessionService.getScores(this.sessionCode);
    const leader = allEntries[0];

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div class="coliseo-header-badge" style="margin: 0;">🏆 Clasificación de la Clase</div>
        <div class="quiz-badge">Sesión: <span style="color: var(--gold);">${escapeHtml(this.sessionCode)}</span></div>
      </div>

      <h1 class="coliseo-title">Tabla de la Sesión</h1>
      <p class="coliseo-lead">
        Revisa las puntuaciones de tus compañeros en la sesión <strong>${escapeHtml(this.sessionCode)}</strong>. ¡El primer lugar se lleva el chocolate!
      </p>

      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 16px; background: rgba(29, 74, 67, 0.35); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--pcb-line); flex-wrap: wrap;">
        <label for="input-cambiar-sesion-tabla" style="font-size: 13px; font-weight: 700; color: var(--gold);">Consultar otra sesión:</label>
        <input id="input-cambiar-sesion-tabla" type="text" value="${escapeHtml(this.sessionCode)}" maxlength="15" style="text-transform: uppercase; font-family: monospace; font-weight: 700; padding: 6px 12px; border-radius: 6px; background: #06161a; color: var(--silk); border: 1px solid var(--gold); width: 150px;" />
        <button type="button" id="btn-cambiar-sesion-tabla" class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;">🔍 Consultar</button>
      </div>

      ${
        leader
          ? `
        <div class="chocolate-banner" style="margin-bottom: 20px;">
          <div class="chocolate-icon">🍫</div>
          <div class="chocolate-info">
            <h4>Líder Actual del Chocolate</h4>
            <p><strong>${escapeHtml(leader.nombre)}</strong> encabeza el podio con <strong>${leader.puntos.toLocaleString()} pts</strong> y ${leader.aciertos}/${leader.totalPreguntas} aciertos.</p>
          </div>
        </div>`
          : ''
      }

      <div class="table-wrapper" style="margin-bottom: 20px;">
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
          <tbody>
            ${
              allEntries.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; opacity: 0.7;">Aún no hay puntuaciones en la sesión "${escapeHtml(this.sessionCode)}". ¡Sé el primero en competir!</td></tr>`
                : allEntries
                    .map((item, idx) => {
                      let rankHtml = `${idx + 1}`;
                      if (idx === 0) rankHtml = `<span class="rank-badge rank-1">👑 1 🍫</span>`;
                      else if (idx === 1) rankHtml = `<span class="rank-badge rank-2">🥈 2</span>`;
                      else if (idx === 2) rankHtml = `<span class="rank-badge rank-3">🥉 3</span>`;

                      return `
                    <tr class="${idx === 0 ? 'top-leader' : ''}">
                      <td>${rankHtml}</td>
                      <td>${escapeHtml(item.nombre)}</td>
                      <td style="font-weight: 700; color: var(--gold);">${item.puntos.toLocaleString()}</td>
                      <td>${item.aciertos}/${item.totalPreguntas}</td>
                      <td>${item.tiempoTotal}s</td>
                      <td style="opacity: 0.75; font-size: 12px;">${item.fecha}</td>
                    </tr>
                  `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>

      <div class="actions">
        ${
          !this.hasCompleted(this.playerName, this.sessionCode)
            ? `<button type="button" id="btn-volver-coliseo" class="btn btn-primary">Volver al Desafío</button>
               <button type="button" id="btn-cerrar-tabla" class="btn btn-secondary">Cerrar</button>`
            : `<button type="button" id="btn-cerrar-tabla" class="btn btn-primary" style="min-width: 200px;">Volver a la Ciudad 🚗</button>`
        }
      </div>
    `;

    const inputSwitch = this.container.querySelector<HTMLInputElement>('#input-cambiar-sesion-tabla');
    const btnSwitch = this.container.querySelector('#btn-cambiar-sesion-tabla');
    const doSwitch = () => {
      const code = inputSwitch?.value.trim().toUpperCase() || 'DEFAULT';
      this.showLeaderboardView(code);
    };
    btnSwitch?.addEventListener('click', doSwitch);
    inputSwitch?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSwitch();
    });

    this.container.querySelector('#btn-volver-coliseo')?.addEventListener('click', () => {
      this.showWelcome();
    });

    this.container.querySelector('#btn-cerrar-tabla')?.addEventListener('click', () => {
      this.close();
    });
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
