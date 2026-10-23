export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 20;

export const SESION_MIN = 3;
export const SESION_MAX = 15;

export type ResultadoNombre = { ok: true; nombre: string } | { ok: false; mensaje: string };
export type ResultadoSesion = { ok: true; codigo: string } | { ok: false; mensaje: string };

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

/** Limpia y valida el código de sesión (letras, números y guiones en mayúscula). */
export function validarCodigoSesion(entrada: string): ResultadoSesion {
  const codigo = entrada.trim().toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
  if (codigo.length === 0) return { ok: false, mensaje: 'Ingresa el código de sesión proporcionado por tu profesor.' };
  if (codigo.length < SESION_MIN) {
    return { ok: false, mensaje: `El código debe tener al menos ${SESION_MIN} caracteres.` };
  }
  if (codigo.length > SESION_MAX) {
    return { ok: false, mensaje: `El código puede tener como máximo ${SESION_MAX} caracteres.` };
  }
  return { ok: true, codigo };
}

/** Datos de la partida actual: nombre del jugador y código de sesión. */
export class Session {
  private nombreJugador = '';
  private sesionActual = '';

  get nombre(): string {
    return this.nombreJugador;
  }

  get codigoSesion(): string {
    return this.sesionActual;
  }

  iniciar(nombre: string, codigoSesion = 'DEFAULT'): void {
    this.nombreJugador = nombre;
    this.sesionActual = codigoSesion.toUpperCase().trim();
  }
}
