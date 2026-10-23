import type { Rotacion } from '../types';
/**
 * Plano de la ciudad: calles, cruces, paradas y qué modelos usar para la decoración.
 * Todo lo que quieras ajustar (cantidad de casas, tamaños, rutas de archivos) está aquí arriba.
 */

/** Mitad del lado del mundo cuadrado (el mundo va de -120 a 120). */
export const WORLD_HALF = 120;

// ---------- Ajustes ----------

/** Con la misma semilla la ciudad sale igual en cada carga. Cámbiala para generar otra distribución. */
export const SEMILLA = 2026;
export const CANTIDAD_CASAS = 45;

/**
 * Los modelos se ajustan a este tamaño máximo (ancho, alto, fondo) manteniendo sus proporciones.
 * Se supone que el FRENTE de cada modelo mira hacia +Z. Si el tuyo mira hacia otro lado, usa
 * GIRO_CASAS (en radianes, múltiplos de 90°): Math.PI / 2, Math.PI o -Math.PI / 2.
 */
export const GIRO_CASAS = 0;

export const CASAS = [
  { file: 'assets/models/buildings/bd1.glb', ancho: 12, alto: 14, fondo: 12 },
  { file: 'assets/models/buildings/bd2.glb', ancho: 12, alto: 14, fondo: 12 },
  { file: 'assets/models/buildings/bd3.glb', ancho: 12, alto: 14, fondo: 12 },
  { file: 'assets/models/buildings/bd4.glb', ancho: 12, alto: 14, fondo: 12 },
  { file: 'assets/models/buildings/bd5.glb', ancho: 12, alto: 14, fondo: 12 },
];

/** `giro` corrige la orientación del modelo, igual que GIRO_CASAS. */
export const PROPS = {
  semaforo: { file: 'assets/models/street/traffic_light.glb', ancho: 4, alto: 7, fondo: 4, giro: 0 },
  alto: { file: 'assets/models/street/stop_sign.glb', ancho: 3, alto: 4.5, fondo: 3, giro: 0 },
  parada: { file: 'assets/models/street/bus_stop.glb', ancho: 9, alto: 5, fondo: 5, giro: 0 },
};

/** Paradas de bus: posición y hacia dónde mira el frente (hacia la calle). */
export const PARADAS = [
  { x: 9.5, z: 40, dx: -1, dz: 0 },
  { x: -9.5, z: -30, dx: 1, dz: 0 },
  { x: -60, z: 9.5, dx: 0, dz: -1 },
  { x: 60, z: -9.5, dx: 0, dz: 1 },
];


// ---------- Autódromo (debe coincidir con la pista que dibuja city.ts) ----------

export const AUTODROMO = { cx: 0, cz: -96, rx: 34, rz: 20 };

// ---------- Calles ----------

export interface Calle {
  /** 'ew' va de este a oeste (z fija); 'ns' va de norte a sur (x fija). */
  dir: 'ew' | 'ns';
  /** Coordenada fija: z si es 'ew', x si es 'ns'. */
  pos: number;
  /** Extremos del tramo en la otra coordenada. */
  desde: number;
  hasta: number;
  ancho: number;
}

/**
 * Modelo del coliseo. Se ajusta (sin deformarse) al área reservada de arriba y su pared sur
 * queda justo donde termina la avenida. `rotacion` sirve para girarlo si hace falta.
 * Si cambias rx / rz de AUTODROMO, el coliseo y el espacio libre de casas cambian juntos.
 */
export const COLISEO: { file: string; ancho: number; alto: number; fondo: number; rotacion: Rotacion } = {
  file: 'assets/models/buildings/colosseum.glb',
  ancho: AUTODROMO.rx * 2,
  alto: 24,
  fondo: AUTODROMO.rz * 2,
  rotacion: {},
};

// Los tramos se extienden media calle de más en las esquinas para que no queden huecos.
export const CALLES: Calle[] = [
  { dir: 'ew', pos: 0, desde: -120, hasta: 120, ancho: 12 },   // avenida este-oeste
  { dir: 'ns', pos: 0, desde: -76, hasta: 120, ancho: 12 },    // avenida norte-sur (llega al autódromo)
  { dir: 'ew', pos: -65, desde: -109, hasta: 109, ancho: 8 },
  { dir: 'ew', pos: 85, desde: -109, hasta: 109, ancho: 8 },
  { dir: 'ns', pos: -105, desde: -69, hasta: 89, ancho: 8 },
  { dir: 'ns', pos: 105, desde: -69, hasta: 89, ancho: 8 },
];


/** ¿El punto (x, z) cae dentro de la calle (con un margen opcional)? */
export function dentroDeCalle(c: Calle, x: number, z: number, margen = 0): boolean {
  const largo = c.dir === 'ew' ? x : z;
  const ancho = c.dir === 'ew' ? z : x;
  return (
    largo >= c.desde - margen &&
    largo <= c.hasta + margen &&
    Math.abs(ancho - c.pos) <= c.ancho / 2 + margen
  );
}

/** Calle más cercana a un punto: distancia al borde (negativa si estás encima) y punto más cercano del eje. */
export function calleMasCercana(x: number, z: number): { calle: Calle; borde: number; px: number; pz: number } {
  let mejor = { calle: CALLES[0], borde: Infinity, px: 0, pz: 0 };
  for (const calle of CALLES) {
    const px = calle.dir === 'ew' ? Math.min(Math.max(x, calle.desde), calle.hasta) : calle.pos;
    const pz = calle.dir === 'ns' ? Math.min(Math.max(z, calle.desde), calle.hasta) : calle.pos;
    const borde = Math.hypot(x - px, z - pz) - calle.ancho / 2;
    if (borde < mejor.borde) mejor = { calle, borde, px, pz };
  }
  return mejor;
}

// ---------- Cruces ----------

export interface Acceso {
  /** Dirección que mira la señal (hacia afuera del cruce, hacia donde viene el tráfico). */
  dx: number;
  dz: number;
  /** Qué señal controla este acceso. */
  control: 'semaforo' | 'alto';
  /** Esquina (signos) donde va el poste: a la derecha de quien llega. */
  sx: number;
  sz: number;
}

export interface Cruce {
  x: number;
  z: number;
  ew: Calle;
  ns: Calle;
  /** Semáforo en cruces donde participa una avenida; señal de alto en los demás. */
  accesos: Acceso[];
}

export function calcularCruces(): Cruce[] {
  const cruces: Cruce[] = [];
  for (const ew of CALLES.filter((c) => c.dir === 'ew')) {
    for (const ns of CALLES.filter((c) => c.dir === 'ns')) {
      const x = ns.pos;
      const z = ew.pos;
      if (x < ew.desde || x > ew.hasta || z < ns.desde || z > ns.hasta) continue;

            // Un acceso existe solo si la calle se prolonga más allá de la mitad de la calle que cruza.
      const mx = ns.ancho / 2 + 0.5;
      const mz = ew.ancho / 2 + 0.5;

      // Semáforos en los accesos de la calle más ancha (si empatan, la norte-sur);
      // señales de alto en los accesos de la otra. Así se alternan al dar la vuelta al cruce.
      const prioridadNs = ns.ancho >= ew.ancho;
      const sem = (porNs: boolean): 'semaforo' | 'alto' => (porNs === prioridadNs ? 'semaforo' : 'alto');

      const accesos: Acceso[] = [];
      if (ns.hasta - z > mz) accesos.push({ dx: 0, dz: 1, sx: 1, sz: 1, control: sem(true) });     // llega desde el sur
      if (z - ns.desde > mz) accesos.push({ dx: 0, dz: -1, sx: -1, sz: -1, control: sem(true) });  // desde el norte
      if (ew.hasta - x > mx) accesos.push({ dx: 1, dz: 0, sx: 1, sz: -1, control: sem(false) });   // desde el este
      if (x - ew.desde > mx) accesos.push({ dx: -1, dz: 0, sx: -1, sz: 1, control: sem(false) });  // desde el oeste
      // Con menos de 3 accesos no es un cruce sino una curva (el recodo de la calle): sin señales.
      if (accesos.length < 3) continue;

      cruces.push({ x, z, ew, ns, accesos });
      
    }
  }
  return cruces;
}
