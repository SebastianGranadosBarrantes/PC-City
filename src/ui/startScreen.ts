import inicioHtml from '../views/inicio.html?raw';
import creditosHtml from '../views/creditos.html?raw';
import { validarNombre, validarCodigoSesion } from '../core/session';
import { CloudSessionService } from '../core/cloudSession';

export interface CreditosData {
  desarrollo: { rol: string; nombre: string }[];
  herramientas: { nombre: string; licencia: string; url: string }[];
  modelos: { nombre: string; autor: string; licencia: string; url: string }[];
}

export interface StartScreenOptions {
  creditos: CreditosData;
  /** Se llama con el nombre y código de sesión validados cuando el jugador presiona "Jugar". */
  onStart: (nombre: string, codigoSesion: string) => void;
  onShowLeaderboard?: (codigoSesion: string) => void;
  onOpenTeacherPanel?: () => void;
}

/** Pantalla de inicio (nombre + sesión + Jugar + Créditos + Docente). */
export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly panelInicio: HTMLElement;
  private readonly panelCreditos: HTMLElement;
  private readonly inputNombre: HTMLInputElement;
  private readonly inputSesion: HTMLInputElement;
  private readonly errorNombre: HTMLElement;
  private readonly errorSesion: HTMLElement;
  private readonly btnJugar: HTMLButtonElement;
  private listo = false;

  constructor(options: StartScreenOptions) {
    this.root = document.createElement('div');
    this.root.className = 'start-screen';
    this.root.innerHTML = inicioHtml + creditosHtml;
    document.body.appendChild(this.root);

    this.panelInicio = this.find('#panel-inicio');
    this.panelCreditos = this.find('#panel-creditos');
    this.inputNombre = this.find<HTMLInputElement>('#nombre-jugador');
    this.inputSesion = this.find<HTMLInputElement>('#codigo-sesion');
    this.errorNombre = this.find('#nombre-error');
    this.errorSesion = this.find('#sesion-error');
    this.btnJugar = this.find<HTMLButtonElement>('#btn-jugar');

    // Auto-completar sesión desde la URL si viene como parámetro ?session=... o del último uso
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    if (sessionParam) {
      this.inputSesion.value = sessionParam.trim().toUpperCase();
    } else {
      const lastSession = localStorage.getItem('pc_city_last_session');
      if (lastSession) this.inputSesion.value = lastSession;
    }

    this.renderCreditos(options.creditos);

    this.find<HTMLFormElement>('#form-inicio').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.listo) return;

      // 1. Validar formato de nombre
      const resNombre = validarNombre(this.inputNombre.value);
      if (!resNombre.ok) {
        this.mostrarErrorNombre(resNombre.mensaje);
        this.inputNombre.focus();
        return;
      }
      this.ocultarErrorNombre();

      // 2. Validar formato de código
      const resSesion = validarCodigoSesion(this.inputSesion.value);
      if (!resSesion.ok) {
        this.mostrarErrorSesion(resSesion.mensaje);
        this.inputSesion.focus();
        return;
      }
      this.ocultarErrorSesion();

      // 3. Validar existencia en la nube (Firestore / local)
      this.btnJugar.disabled = true;
      this.btnJugar.textContent = 'Verificando sesión…';

      const validCloud = await CloudSessionService.validateSession(resSesion.codigo);
      if (!validCloud.ok) {
        this.mostrarErrorSesion(validCloud.mensaje || 'Sesión no válida.');
        this.inputSesion.focus();
        this.btnJugar.disabled = false;
        this.btnJugar.textContent = 'Jugar';
        return;
      }

      localStorage.setItem('pc_city_last_session', resSesion.codigo);
      this.btnJugar.disabled = false;
      this.btnJugar.textContent = 'Jugar';
      options.onStart(resNombre.nombre, resSesion.codigo);
    });

    this.inputNombre.addEventListener('input', () => this.ocultarErrorNombre());
    this.inputSesion.addEventListener('input', () => {
      this.inputSesion.value = this.inputSesion.value.toUpperCase();
      this.ocultarErrorSesion();
    });

    this.find('#btn-creditos').addEventListener('click', () => this.mostrarPanel('creditos'));
    this.find('#btn-volver').addEventListener('click', () => this.mostrarPanel('inicio'));
    this.find('#btn-tabla-inicio')?.addEventListener('click', () => {
      const code = this.inputSesion.value.trim().toUpperCase() || 'DEFAULT';
      options.onShowLeaderboard?.(code);
    });
    this.find('#btn-docente-inicio')?.addEventListener('click', () => options.onOpenTeacherPanel?.());

    this.inputNombre.focus();
  }

  setSessionCode(codigo: string): void {
    if (this.inputSesion) {
      this.inputSesion.value = codigo.toUpperCase().trim();
    }
  }

  /** Habilita el botón Jugar (cuando la ciudad ya terminó de cargar). */
  setReady(): void {
    this.listo = true;
    this.btnJugar.disabled = false;
    this.btnJugar.textContent = 'Jugar';
  }

  show(): void {
    this.root.classList.remove('hidden');
    this.mostrarPanel('inicio');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  // ---------- Interno ----------

  private find<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`No se encontró "${selector}" en las vistas.`);
    return el;
  }

  private mostrarPanel(cual: 'inicio' | 'creditos'): void {
    this.panelInicio.classList.toggle('hidden', cual !== 'inicio');
    this.panelCreditos.classList.toggle('hidden', cual !== 'creditos');
    if (cual === 'inicio') this.inputNombre.focus();
  }

  private mostrarErrorNombre(mensaje: string): void {
    this.errorNombre.textContent = mensaje;
    this.errorNombre.hidden = false;
    this.inputNombre.setAttribute('aria-invalid', 'true');
  }

  private ocultarErrorNombre(): void {
    this.errorNombre.hidden = true;
    this.inputNombre.removeAttribute('aria-invalid');
  }

  private mostrarErrorSesion(mensaje: string): void {
    this.errorSesion.textContent = mensaje;
    this.errorSesion.hidden = false;
    this.inputSesion.setAttribute('aria-invalid', 'true');
  }

  private ocultarErrorSesion(): void {
    this.errorSesion.hidden = true;
    this.inputSesion.removeAttribute('aria-invalid');
  }

  private renderCreditos(data: CreditosData): void {
    const desarrollo = this.find('#creditos-desarrollo');
    for (const d of data.desarrollo) agregarItem(desarrollo, d.rol, [{ valor: d.nombre, etiqueta: 'Nombre' }]);

    const herramientas = this.find('#creditos-herramientas');
    for (const h of data.herramientas) {
      agregarItem(herramientas, h.nombre, [{ valor: h.licencia, etiqueta: 'Licencia' }], h.url);
    }

    const modelos = this.find('#creditos-modelos');
    for (const m of data.modelos) {
      agregarItem(
        modelos,
        m.nombre,
        [
          { valor: m.autor, etiqueta: 'Autor' },
          { valor: m.licencia, etiqueta: 'Licencia' },
        ],
        m.url,
      );
    }
  }
}

function agregarItem(
  lista: HTMLElement,
  titulo: string,
  campos: { valor: string; etiqueta: string }[],
  url = '',
): void {
  const li = document.createElement('li');

  const nombre = document.createElement('span');
  nombre.className = 'credit-name';
  nombre.textContent = titulo;

  const meta = document.createElement('span');
  meta.className = 'credit-meta';
  campos.forEach((campo, i) => {
    if (i > 0) meta.append(' · ');
    const parte = document.createElement('span');
    if (campo.valor.trim()) {
      parte.textContent = campo.valor;
    } else {
      parte.textContent = `${campo.etiqueta} por completar`;
      parte.className = 'credit-missing';
    }
    meta.append(parte);
  });

  if (url.startsWith('https://')) {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.textContent = 'Fuente';
    meta.append(' · ', enlace);
  }

  li.append(nombre, meta);
  lista.append(li);
}
