import * as THREE from 'three';
import type { Interactable, PiezaData } from '../types';
import { distanceToBox, type AABB } from './colliders';
import { loadFittedModel, type FittedModel } from './modelLoader';
import { AUTODROMO, CALLES, COLISEO, WORLD_HALF, dentroDeCalle } from './layout';
import { buildScenery } from './scenery';

export { WORLD_HALF };

const AUTODROMO_CENTER = new THREE.Vector3(AUTODROMO.cx, 0, AUTODROMO.cz);
const START_LINE = new THREE.Vector3(0, 0, -80); // meta del autódromo

export interface City {
  colliders: AABB[];
  interactables: Interactable[];
}

export interface CityHandlers {
  onPieza: (pieza: PiezaData) => void;
  onAutodromo: () => void;
  autodromoPrompt: () => string;
}

export async function buildCity(
  scene: THREE.Scene,
  piezas: PiezaData[],
  handlers: CityHandlers,
): Promise<City> {
  const colliders: AABB[] = [];
  const interactables: Interactable[] = [];

  addGround(scene);
  addRoads(scene);
  const arena = addAutodromo(scene, interactables, colliders, handlers); // carga en paralelo con las piezas

  const fitted = await Promise.all(piezas.map((pieza) => loadPiezaModel(pieza)));

  piezas.forEach((pieza, i) => {
    const { object, size } = fitted[i];
    scene.add(createBuilding(pieza, object, size));

    // El colisionador sale del tamaño REAL del modelo ya ajustado.
    const box: AABB = {
      minX: pieza.x - size.x / 2,
      maxX: pieza.x + size.x / 2,
      minZ: pieza.z - size.z / 2,
      maxZ: pieza.z + size.z / 2,
    };
    colliders.push(box);
    interactables.push({
      id: pieza.id,
      range: 6,
      prompt: () => `Presiona E para ver: ${pieza.nombre}`,
      distance: (p) => distanceToBox(p, box),
      onInteract: () => handlers.onPieza(pieza),
    });
  });
    await arena;

  // Señales, paradas y casas (se colocan después para esquivar las piezas).
  colliders.push(...(await buildScenery(scene, colliders)));

  return { colliders, interactables };
}

/** Si el GLB falla (ruta mal escrita, etc.), usa una caja gris para que el juego siga. */
async function loadPiezaModel(pieza: PiezaData): Promise<FittedModel> {
  try {
       return await loadFittedModel(pieza.filePath, pieza, pieza.rotacion);
  } catch (error) {
    console.warn(`No se pudo cargar "${pieza.filePath}" (${pieza.id}). Se usa una caja.`, error);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(pieza.ancho, pieza.alto, pieza.fondo),
      new THREE.MeshStandardMaterial({ color: 0x888888 }),
    );
    box.position.y = pieza.alto / 2;
    const object = new THREE.Group();
    object.add(box);
    return { object, size: new THREE.Vector3(pieza.ancho, pieza.alto, pieza.fondo) };
  }
}

/**
 * Edificio provisional: una caja de color con el nombre encima.
 * Cuando tengas los modelos GLB, reemplaza el cuerpo de esta función; el
 * colisionador y la interacción salen de los datos (ancho/alto/fondo), no del modelo.
 */
function createBuilding(pieza: PiezaData, model: THREE.Object3D, size: THREE.Vector3): THREE.Object3D {
  const group = new THREE.Group();
  group.position.set(pieza.x, 0, pieza.z);
  group.add(model);

  const label = createLabel(pieza.nombre, 14);
  label.position.y = size.y + 2.5;
  group.add(label);

  return group;
}

// ---------- Suelo, calles y autódromo ----------

function flatPlane(width: number, depth: number, material: THREE.Material, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function addGround(scene: THREE.Scene): void {
  const grass = new THREE.MeshStandardMaterial({ color: 0x6b9f5e, roughness: 1 });
  scene.add(flatPlane(WORLD_HALF * 2, WORLD_HALF * 2, grass, 0));
}

function addRoads(scene: THREE.Scene): void {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3b414a, roughness: 0.95 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xf5ecc8 });
  const dashGeo = new THREE.PlaneGeometry(5, 0.4);
  dashGeo.rotateX(-Math.PI / 2);

  for (const calle of CALLES) {
    const esEw = calle.dir === 'ew';
    const largo = calle.hasta - calle.desde;
    const medio = (calle.desde + calle.hasta) / 2;

    const road = flatPlane(esEw ? largo : calle.ancho, esEw ? calle.ancho : largo, asphalt, 0.05);
    road.position.set(esEw ? medio : calle.pos, 0.05, esEw ? calle.pos : medio);
    scene.add(road);

    // Líneas centrales discontinuas, sin pintar dentro de los cruces.
    for (let t = calle.desde + 6; t < calle.hasta; t += 12) {
      const x = esEw ? t : calle.pos;
      const z = esEw ? calle.pos : t;
      if (CALLES.some((otra) => otra.dir !== calle.dir && dentroDeCalle(otra, x, z, 3))) continue;
      const dash = new THREE.Mesh(dashGeo, paint);
      dash.position.set(x, 0.08, z);
      if (!esEw) dash.rotation.y = Math.PI / 2;
      scene.add(dash);
    }
  }
}

function addPistaProvisional(scene: THREE.Scene, interactables: Interactable[], handlers: CityHandlers): void {
  // Pista ovalada: elipse exterior con un hueco elíptico (ancho de pista = 8).
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, AUTODROMO.rx, AUTODROMO.rz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, AUTODROMO.rx - 8, AUTODROMO.rz - 8, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);

  const geometry = new THREE.ShapeGeometry(shape, 64);
  geometry.rotateX(-Math.PI / 2);
  const track = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.9 }),
  );
  track.position.set(AUTODROMO_CENTER.x, 0.06, AUTODROMO_CENTER.z);
  scene.add(track);

  // Línea de meta (cruza la pista, que aquí corre de este a oeste).
  const line = flatPlane(1.5, 8, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.09);
  line.position.set(START_LINE.x, 0.09, START_LINE.z);
  scene.add(line);

  const sign = createLabel('AUTÓDROMO', 20);
  sign.position.set(START_LINE.x, 7, START_LINE.z);
  scene.add(sign);

  interactables.push({
    id: 'autodromo',
    range: 9,
    prompt: handlers.autodromoPrompt,
    distance: (p) => Math.hypot(p.x - START_LINE.x, p.z - START_LINE.z),
    onInteract: handlers.onAutodromo,
  });
}

/** Coliseo: modelo GLB con su colisión y su cartel. Si no carga, se usa la pista provisional. */
async function addAutodromo(
  scene: THREE.Scene,
  interactables: Interactable[],
  colliders: AABB[],
  handlers: CityHandlers,
): Promise<void> {
  try {
    const { object, size } = await loadFittedModel(COLISEO.file, COLISEO, COLISEO.rotacion);

    // La pared sur queda justo donde termina la avenida; el modelo se centra en X.
    const paredSur = AUTODROMO.cz + AUTODROMO.rz;
    const centroZ = paredSur - size.z / 2;
    object.position.set(AUTODROMO.cx, 0, centroZ);
    scene.add(object);

    const box: AABB = {
      minX: AUTODROMO.cx - size.x / 2,
      maxX: AUTODROMO.cx + size.x / 2,
      minZ: centroZ - size.z / 2,
      maxZ: paredSur,
    };
    colliders.push(box);

    const sign = createLabel('COLISEO', 20);
    sign.position.set(AUTODROMO.cx, size.y + 3, paredSur);
    scene.add(sign);

    interactables.push({
      id: 'autodromo',
      range: 8,
      prompt: handlers.autodromoPrompt,
      distance: (p) => distanceToBox(p, box),
      onInteract: handlers.onAutodromo,
    });
  } catch (error) {
    console.warn(`No se pudo cargar "${COLISEO.file}". Se usa la pista provisional.`, error);
    addPistaProvisional(scene, interactables, handlers);
  }
}

// ---------- Carteles ----------

/** Cartel con texto que siempre mira a la cámara. `worldWidth` es su ancho en el mundo. */
function createLabel(text: string, worldWidth: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(10, 32, 30, 0.88)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 120, 24);
  ctx.fill();

  // Achica la letra hasta que el texto quepa.
  let size = 56;
  do {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    size -= 2;
  } while (ctx.measureText(text).width > 460 && size > 20);

  ctx.fillStyle = '#f4f1e6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(worldWidth, worldWidth / 4, 1);
  return sprite;
}
