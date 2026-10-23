import type { PiezaData } from '../types';

/** Ventana emergente con la explicación de una pieza (o un mensaje simple). */
export class Popup {
  private readonly overlay: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly tipBox: HTMLElement;
  private readonly tipText: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'popup-overlay hidden';
    this.overlay.innerHTML = `
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <div class="popup-guide" aria-hidden="true">🤖</div>
        <div class="popup-content">
          <h2 class="popup-title" id="popup-title"></h2>
          <p class="popup-text"></p>
          <div class="popup-tip">
            <h3>Mantenimiento</h3>
            <p class="popup-tip-text"></p>
          </div>
          <p class="popup-hint">Presiona E o Esc para cerrar</p>
        </div>
      </div>`;
    document.body.appendChild(this.overlay);

    this.title = this.overlay.querySelector<HTMLElement>('.popup-title')!;
    this.text = this.overlay.querySelector<HTMLElement>('.popup-text')!;
    this.tipBox = this.overlay.querySelector<HTMLElement>('.popup-tip')!;
    this.tipText = this.overlay.querySelector<HTMLElement>('.popup-tip-text')!;
  }

  get isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  showPieza(pieza: PiezaData): void {
    this.show(pieza.nombre, pieza.descripcion, pieza.mantenimiento);
  }

  show(title: string, text: string, tip = ''): void {
    this.title.textContent = title;
    this.text.textContent = text;
    this.tipText.textContent = tip;
    this.tipBox.hidden = tip === '';
    this.overlay.classList.remove('hidden');
  }

  close(): void {
    this.overlay.classList.add('hidden');
  }
}
