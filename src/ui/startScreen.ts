import inicioHtml from '../views/inicio.html?raw';
import creditosHtml from '../views/creditos.html?raw';
import { validarNombre } from '../core/session';

export interface CreditosData {
  desarrollo: { rol: string; nombre: string }[];
  herramientas: { nombre: string; licencia: string; url: string }[];
  modelos: { nombre: string; autor: string; licencia: string; url: string }[];
}

export interface StartScreenOptions {
  creditos: CreditosData;
  /** Se llama con el nombre ya validado cuando el jugador presiona "Jugar". */
  onStart: (nombre: string) => void;
  onShowLeaderboard?: () => void;
}

/** Pantalla de inicio (nombre + Jugar + Créditos) y la pantalla de créditos. */
export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly panelInicio: HTMLElement;
  private readonly panelCreditos: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly error: HTMLElement;
  private readonly btnJugar: HTMLButtonElement;
  private listo = false;

  constructor(options: StartScreenOptions) {
    this.root = document.createElement('div');
    this.root.className = 'start-screen';
    this.root.innerHTML = inicioHtml + creditosHtml;
    document.body.appendChild(this.root);

    this.panelInicio = this.find('#panel-inicio');
    this.panelCreditos = this.find('#panel-creditos');
    this.input = this.find<HTMLInputElement>('#nombre-jugador');
    this.error = this.find('#nombre-error');
    this.btnJugar = this.find<HTMLButtonElement>('#btn-jugar');

    this.renderCreditos(options.creditos);

    this.find<HTMLFormElement>('#form-inicio').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.listo) return;
      const resultado = validarNombre(this.input.value);
      if (!resultado.ok) {
        this.mostrarError(resultado.mensaje);
        this.input.focus();
        return;
      }
      this.ocultarError();
      options.onStart(resultado.nombre);
    });

    this.input.addEventListener('input', () => this.ocultarError());
    this.find('#btn-creditos').addEventListener('click', () => this.mostrarPanel('creditos'));
    this.find('#btn-volver').addEventListener('click', () => this.mostrarPanel('inicio'));
    this.find('#btn-tabla-inicio')?.addEventListener('click', () => options.onShowLeaderboard?.());

    this.input.focus();
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
    if (cual === 'inicio') this.input.focus();
  }

  private mostrarError(mensaje: string): void {
    this.error.textContent = mensaje;
    this.error.hidden = false;
    this.input.setAttribute('aria-invalid', 'true');
  }

  private ocultarError(): void {
    this.error.hidden = true;
    this.input.removeAttribute('aria-invalid');
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
      parte.textContent = `${campo.etiqueta} por completar`; // se ve en rojo para no olvidarlo
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
