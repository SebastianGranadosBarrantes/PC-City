export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 20;

export type ResultadoNombre = { ok: true; nombre: string } | { ok: false; mensaje: string };

/** Limpia el texto escrito (espacios de más) y comprueba que sirva como nombre de jugador. */
export function validarNombre(entrada: string): ResultadoNombre {
  const nombre = entrada.trim().replace(/\s+/g, ' ');
  if (nombre.length === 0) return { ok: false, mensaje: 'Escribe tu nombre para empezar.' };
  if (nombre.length < NOMBRE_MIN) {
    return { ok: false, mensaje: `El nombre debe tener al menos ${NOMBRE_MIN} caracteres.` };
  }
  if (nombre.length > NOMBRE_MAX) {
    return { ok: false, mensaje: `El nombre puede tener como máximo ${NOMBRE_MAX} caracteres.` };
  }
  return { ok: true, nombre };
}

/** Datos de la partida actual (por ahora, solo el nombre del jugador). */
export class Session {
  private nombreJugador = '';

  get nombre(): string {
    return this.nombreJugador;
  }

  iniciar(nombre: string): void {
    this.nombreJugador = nombre;
  }
}
