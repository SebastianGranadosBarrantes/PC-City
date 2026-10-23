import * as THREE from 'three';
import { loadFittedModel } from '../world/modelLoader';
import { createPlaceholderCar } from './car';

/**
 * Modelo del carro del jugador. Cambia aquí la ruta y el tamaño.
 * El carro avanza hacia -Z; la mayoría de los modelos miran hacia +Z, por eso `y: 180`.
 * Si al conducir el carro va "de reversa", cambia y a 0; si va de lado, prueba 90 o -90.
 */
export const CAR_MODEL = {
  file: 'assets/models/cars/rx7.glb',
  ancho: 2.4,
  alto: 2,
  fondo: 4.4,
  rotacion: { y: 180 },
};

/** Carga el modelo. Si falla (ruta mal escrita, etc.), usa el carrito provisional. */
export async function loadCarModel(): Promise<THREE.Object3D> {
  try {
    const { object } = await loadFittedModel(CAR_MODEL.file, CAR_MODEL, CAR_MODEL.rotacion);
    return object;
  } catch (error) {
    console.warn(`No se pudo cargar "${CAR_MODEL.file}". Se usa el carrito provisional.`, error);
    return createPlaceholderCar();
  }
}