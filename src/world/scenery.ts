import * as THREE from 'three';
import type { AABB } from './colliders';
import { loadFittedModel, type FittedModel } from './modelLoader';
import {
  AUTODROMO,
  CALLES,
  CANTIDAD_CASAS,
  CASAS,
  GIRO_CASAS,
  PARADAS,
  PROPS,
  SEMILLA,
  WORLD_HALF,
  calcularCruces,
  calleMasCercana,
} from './layout';

/** Generador pseudoaleatorio con semilla: mismo número de semilla, misma ciudad. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEPARACION_CALLE = 6;  // espacio mínimo entre el borde de la calle y la casa
const BANDA_CALLE = 20;      // las casas se ubican a lo sumo a esta distancia de una calle

function seTraslapan(a: AABB, b: AABB, margen: number): boolean {
  return (
    a.minX - margen < b.maxX && a.maxX + margen > b.minX &&
    a.minZ - margen < b.maxZ && a.maxZ + margen > b.minZ
  );
}

export interface CasaColocada {
  tipo: number;
  x: number;
  z: number;
  yaw: number;
  escala: number;
  caja: AABB;
}

/**
 * Elige posiciones aleatorias para las casas: a lo largo de las calles, mirando hacia ellas,
 * sin tapar calles, piezas, señales ni el autódromo, y sin traslaparse entre sí.
 */
export function colocarCasas(
  tipos: { ancho: number; fondo: number }[],
  obstaculos: AABB[],
  cantidad: number,
  rng: () => number,
): CasaColocada[] {
  const colocadas: CasaColocada[] = [];
  if (tipos.length === 0) return colocadas;

  for (let intento = 0; intento < cantidad * 80 && colocadas.length < cantidad; intento++) {
    const tipo = Math.floor(rng() * tipos.length);
    const escala = 0.85 + rng() * 0.3;
    const x = (rng() * 2 - 1) * (WORLD_HALF - 8);
    const z = (rng() * 2 - 1) * (WORLD_HALF - 8);

    // Orientación: el frente (+Z del modelo) mira hacia la calle más cercana, en múltiplos de 90°.
    const { borde, px, pz } = calleMasCercana(x, z);
    const vx = px - x;
    const vz = pz - z;
    const yaw =
      (Math.abs(vz) >= Math.abs(vx) ? (vz > 0 ? 0 : Math.PI) : vx > 0 ? Math.PI / 2 : -Math.PI / 2) +
      GIRO_CASAS;

    const ancho = tipos[tipo].ancho * escala;
    const fondo = tipos[tipo].fondo * escala;
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const hx = (c * ancho + s * fondo) / 2;
    const hz = (s * ancho + c * fondo) / 2;
    const r = Math.max(hx, hz);

    if (borde - r < SEPARACION_CALLE || borde - r > BANDA_CALLE) continue;
    if (Math.abs(x) + hx > WORLD_HALF - 4 || Math.abs(z) + hz > WORLD_HALF - 4) continue;

    const ex = (x - AUTODROMO.cx) / (AUTODROMO.rx + hx + 8);
    const ez = (z - AUTODROMO.cz) / (AUTODROMO.rz + hz + 8);
    if (ex * ex + ez * ez < 1) continue;

    const caja: AABB = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
    if (obstaculos.some((o) => seTraslapan(caja, o, 3))) continue;
    if (colocadas.some((o) => seTraslapan(caja, o.caja, 2))) continue;

    colocadas.push({ tipo, x, z, yaw, escala, caja });
  }
  return colocadas;
}

// ---------- Carga y colocación en la escena ----------

async function cargarOpcional(def: { file: string; ancho: number; alto: number; fondo: number }): Promise<FittedModel | null> {
  try {
    return await loadFittedModel(def.file, def);
  } catch (error) {
    console.warn(`No se pudo cargar "${def.file}". Se omite.`, error);
    return null;
  }
}

/**
 * Caja que ocupa la BASE del objeto (los vértices a menos de `alturaMax` del suelo).
 * Sirve para postes: lo que bloquea al carro es el poste, no el brazo ni la cabeza del semáforo.
 */
export function cajaDeBase(objeto: THREE.Object3D, alturaMax: number): THREE.Box3 | null {
  const caja = new THREE.Box3();
  const v = new THREE.Vector3();
  objeto.updateWorldMatrix(true, true);
  objeto.traverse((hijo) => {
    if (!(hijo instanceof THREE.Mesh)) return;
    const pos = hijo.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(hijo.matrixWorld);
      if (v.y <= alturaMax) caja.expandByPoint(v);
    }
  });
  return caja.isEmpty() ? null : caja;
}

/**
 * Pone una copia del modelo en la escena y devuelve su caja de colisión.
 * Con `anclar` (señales y paradas) el modelo se corre para que su poste quede exactamente
 * en (x, z) y la colisión es la de la base, no la de todo el modelo.
 */
export function colocar(
  scene: THREE.Scene,
  modelo: FittedModel,
  x: number,
  z: number,
  yaw: number,
  escala = 1,
  anclar = false,
): AABB {
  const holder = new THREE.Group();
  holder.add(modelo.object.clone(true)); // comparte geometría y materiales: barato
  holder.scale.setScalar(escala);
  holder.rotation.y = yaw;
  holder.position.set(x, 0, z);
  scene.add(holder);
  holder.updateMatrixWorld(true);

  if (anclar) {
    const pie = cajaDeBase(holder, 0.6);
    if (pie) {
      holder.position.x += x - (pie.min.x + pie.max.x) / 2;
      holder.position.z += z - (pie.min.z + pie.max.z) / 2;
      holder.updateMatrixWorld(true);
      const hx = Math.max((pie.max.x - pie.min.x) / 2, 0.4); // mínimo 0.8 de ancho
      const hz = Math.max((pie.max.z - pie.min.z) / 2, 0.4);
      return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
    }
  }

  const box = new THREE.Box3().setFromObject(holder);
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
}

/** Avisa en consola si alguna calle atraviesa una de las piezas principales. */
function revisarCallesContraPiezas(piezas: AABB[]): void {
  for (const calle of CALLES) {
    const medio = calle.ancho / 2;
    const caja: AABB =
      calle.dir === 'ew'
        ? { minX: calle.desde, maxX: calle.hasta, minZ: calle.pos - medio, maxZ: calle.pos + medio }
        : { minX: calle.pos - medio, maxX: calle.pos + medio, minZ: calle.desde, maxZ: calle.hasta };
    piezas.forEach((p, i) => {
      if (seTraslapan(caja, p, 0)) {
        console.warn(`La calle ${calle.dir} en ${calle.pos} atraviesa la pieza #${i}. Mueve la pieza o la calle.`);
      }
    });
  }
}

/**
 * Decoración de la ciudad: señales en los cruces, paradas de bus y casas aleatorias.
 * Devuelve las cajas de colisión de todo lo que agrega.
 */
export async function buildScenery(scene: THREE.Scene, piezas: AABB[]): Promise<AABB[]> {
  revisarCallesContraPiezas(piezas);

  const [semaforo, alto, parada, ...casas] = await Promise.all([
    cargarOpcional(PROPS.semaforo),
    cargarOpcional(PROPS.alto),
    cargarOpcional(PROPS.parada),
    ...CASAS.map(cargarOpcional),
  ]);

  const nuevos: AABB[] = [];

    // Una señal por acceso, a la derecha de quien llega y mirando hacia él. Se alternan
  // semáforo y señal de alto según el acceso (ver calcularCruces en layout.ts).
  for (const cruce of calcularCruces()) {
    for (const a of cruce.accesos) {
      const esSemaforo = a.control === 'semaforo';
      const modelo = esSemaforo ? semaforo : alto;
      if (!modelo) continue;
      const giro = esSemaforo ? PROPS.semaforo.giro : PROPS.alto.giro;
      const x = cruce.x + a.sx * (cruce.ns.ancho / 2 + 1.5);
      const z = cruce.z + a.sz * (cruce.ew.ancho / 2 + 1.5);
      nuevos.push(colocar(scene, modelo, x, z, Math.atan2(a.dx, a.dz) + giro, 1, true));
    }
  }

  // Paradas de bus, con el frente hacia la calle.
  if (parada) {
    for (const p of PARADAS) {
      nuevos.push(colocar(scene, parada, p.x, p.z, Math.atan2(p.dx, p.dz) + PROPS.parada.giro, 1, true));
    }
  }

  // Casas aleatorias (se cargan solo los tipos que existen).
  const disponibles = casas.flatMap((c) => (c ? [c] : []));
  const lugares = colocarCasas(
    disponibles.map((c) => ({ ancho: c.size.x, fondo: c.size.z })),
    [...piezas, ...nuevos],
    CANTIDAD_CASAS,
    mulberry32(SEMILLA),
  );
  for (const l of lugares) {
    nuevos.push(colocar(scene, disponibles[l.tipo], l.x, l.z, l.yaw, l.escala));
  }

  return nuevos;
}
