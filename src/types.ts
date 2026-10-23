import type { Vector3 } from 'three';

/** Contenido y ubicación de una pieza de PC (viene de data/piezas.json). */
export interface PiezaData {
  id: string;
  nombre: string;
  descripcion: string;
  mantenimiento: string;
  x: number;
  z: number;
  ancho: number;
  alto: number;
  fondo: number;
  filePath: string;
  rotacion?: Rotacion;
}

/** Algo con lo que el jugador puede interactuar presionando E. */
export interface Interactable {
  id: string;
  /** Qué tan cerca debe estar el carro (en unidades del mundo). */
  range: number;
  prompt: () => string;
  /** Distancia desde la posición del carro hasta este objeto. */
  distance: (p: Vector3) => number;
  onInteract: () => void;
}


export interface Rotacion {
  x?: number;
  y?: number;
  z?: number;
}