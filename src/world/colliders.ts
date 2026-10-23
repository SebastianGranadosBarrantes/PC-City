import * as THREE from 'three';

/** Caja alineada con los ejes (en el plano XZ). */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Empuja el círculo (pos, radius) fuera de la caja si se están traslapando.
 * Devuelve true si hubo colisión.
 */
export function pushOutOfBox(pos: THREE.Vector3, radius: number, box: AABB): boolean {
  const cx = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX); // punto de la caja más cercano
  const cz = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return false;

  if (distSq === 0) {
    // El centro quedó dentro de la caja: salir por el lado más cercano.
    const left = pos.x - box.minX;
    const right = box.maxX - pos.x;
    const near = pos.z - box.minZ;
    const far = box.maxZ - pos.z;
    const m = Math.min(left, right, near, far);
    if (m === left) pos.x = box.minX - radius;
    else if (m === right) pos.x = box.maxX + radius;
    else if (m === near) pos.z = box.minZ - radius;
    else pos.z = box.maxZ + radius;
    return true;
  }

  const dist = Math.sqrt(distSq);
  const push = radius - dist;
  pos.x += (dx / dist) * push;
  pos.z += (dz / dist) * push;
  return true;
}

/** Distancia (en XZ) desde un punto hasta la caja. 0 si está dentro. */
export function distanceToBox(p: THREE.Vector3, box: AABB): number {
  const cx = THREE.MathUtils.clamp(p.x, box.minX, box.maxX);
  const cz = THREE.MathUtils.clamp(p.z, box.minZ, box.maxZ);
  return Math.hypot(p.x - cx, p.z - cz);
}
