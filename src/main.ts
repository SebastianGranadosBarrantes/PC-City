import './style.css';
import './styles/screens.css';
import * as THREE from 'three';
import piezasJson from './data/piezas.json';
import creditosJson from './data/creditos.json';
import type { Interactable, PiezaData } from './types';
import { Input } from './core/input';
import { Progress } from './core/progress';
import { Session } from './core/session';
import { ChaseCamera } from './core/chaseCamera';
import { Car } from './entities/car';
import { loadCarModel } from './entities/carModel';
import { buildCity, WORLD_HALF } from './world/city';
import { pushOutOfBox } from './world/colliders';
import { Hud } from './ui/hud';
import { Popup } from './ui/popup';
import { StartScreen } from './ui/startScreen';

const piezas: PiezaData[] = piezasJson;

// ---------- Escena base ----------
const SKY = 0x87ceeb;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 80, 260); // suaviza el horizonte y esconde el borde del mundo

scene.add(new THREE.HemisphereLight(0xffffff, 0x556655, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(50, 100, 30);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Estado del juego ----------
type Estado = 'inicio' | 'jugando';
let estado: Estado = 'inicio';

const input = new Input();
const hud = new Hud();
hud.setVisible(false); // el HUD solo aparece cuando empieza la partida
const popup = new Popup();
const session = new Session();
const progress = new Progress(piezas.map((p) => p.id));

// La pantalla de inicio se muestra YA, mientras la ciudad se carga detrás.
const startScreen = new StartScreen({
  creditos: creditosJson,
  onStart: (nombre) => {
    session.iniciar(nombre);
    hud.setPlayerName(session.nombre);
    hud.setVisible(true);
    startScreen.hide();
    chase.snap(); // la cámara pasa de golpe a ir detrás del carro
    estado = 'jugando';
  },
});

function refreshProgress(): void {
  hud.setProgress(piezas.map((p) => ({ nombre: p.nombre, visitada: progress.has(p.id) })));
}
progress.subscribe(refreshProgress);
refreshProgress();

const faltan = (n: number) => (n === 1 ? 'te falta 1 pieza' : `te faltan ${n} piezas por descubrir`);
  const carModel = loadCarModel();

// ---------- Mundo ----------
const city = await buildCity(scene, piezas, {
  onPieza: (pieza) => {
    const estabaCompleto = progress.isComplete;
    progress.visit(pieza.id);
    popup.showPieza(pieza);
    if (!estabaCompleto && progress.isComplete) hud.toast('¡Autódromo desbloqueado!');
  },
  onAutodromo: () => {
    if (!progress.isComplete) {
      popup.show('Coliseo bloqueado', `Primero visita todas las piezas de la ciudad: ${faltan(progress.missing)}.`);
      return;
    }
    popup.show('Coliseo', 'Aquí va a empezar el quiz. Por ahora es solo una prueba de la interacción.');
  },
  autodromoPrompt: () =>
    progress.isComplete
      ? 'Presiona E para entrar al coliseo'
      : `Coliseo bloqueado: ${faltan(progress.missing)}`,
});

// ---------- Jugador ----------
const car = new Car(await carModel);
scene.add(car.object);
const chase = new ChaseCamera(camera, car.object);

startScreen.setReady(); // ya se puede jugar

// ---------- Utilidades del bucle ----------
const LIMIT = WORLD_HALF - 3;

function keepInsideWorld(): void {
  const p = car.position;
  const x = THREE.MathUtils.clamp(p.x, -LIMIT, LIMIT);
  const z = THREE.MathUtils.clamp(p.z, -LIMIT, LIMIT);
  if (x !== p.x || z !== p.z) {
    p.x = x;
    p.z = z;
    car.bump();
  }
}

function findNearest(items: Interactable[]): Interactable | null {
  let best: Interactable | null = null;
  let bestDist = Infinity;
  for (const item of items) {
    const d = item.distance(car.position);
    if (d <= item.range && d < bestDist) {
      best = item;
      bestDist = d;
    }
  }
  return best;
}

/** En la pantalla de inicio la cámara da vueltas lentas alrededor de la ciudad. */
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
function orbitarCiudad(time: number): void {
  const a = sinMovimiento ? 0.8 : time * 0.00006;
  camera.position.set(Math.cos(a) * 95, 45, Math.sin(a) * 95);
  camera.lookAt(0, 5, 0);
}

function actualizarJuego(dt: number): void {
  // Con el popup abierto el carro no recibe órdenes (se frena solo).
  const frozen = popup.isOpen;
  car.update(dt, frozen ? 0 : input.throttle, frozen ? 0 : input.steer);

  for (const box of city.colliders) {
    if (pushOutOfBox(car.position, car.radius, box)) car.bump();
  }
  keepInsideWorld();

  if (popup.isOpen) {
    hud.hidePrompt();
    if (input.wasPressed('KeyE') || input.wasPressed('Escape')) popup.close();
  } else {
    const nearest = findNearest(city.interactables);
    if (nearest) {
      hud.showPrompt(nearest.prompt());
      if (input.wasPressed('KeyE')) nearest.onInteract();
    } else {
      hud.hidePrompt();
    }
  }

  chase.update(dt);
}

// ---------- Bucle ----------
let last = 0;
renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - last) / 1000, 0.05); // evita saltos al volver a la pestaña
  last = time;

  if (estado === 'inicio') orbitarCiudad(time);
  else actualizarJuego(dt);

  renderer.render(scene, camera);
  input.endFrame();
});
