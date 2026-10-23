import * as THREE from 'three';

/** Cámara que sigue al objetivo desde atrás y un poco arriba, mirando hacia adelante. */
export class ChaseCamera {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly target: THREE.Object3D;
  private readonly offset = new THREE.Vector3(0, 7, 14); // detrás (+Z) y arriba
  private readonly lookAhead = 8;                         // mira 8 unidades por delante del carro
  private readonly desired = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly lookDesired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();            // punto que mira la cámara (suavizado)

  constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
    this.camera = camera;
    this.target = target;
    this.snap();
  }

  /** Coloca la cámara de inmediato en su posición ideal (sin suavizado). */
  snap(): void {
    this.computeDesired();
    this.camera.position.copy(this.desired);
    this.look.copy(this.lookDesired);
    this.camera.lookAt(this.look);
  }

  update(dt: number): void {
    this.computeDesired();
    const t = 1 - Math.exp(-5 * dt);
    this.camera.position.lerp(this.desired, t);
    this.look.lerp(this.lookDesired, t);
    this.camera.lookAt(this.look);
  }

  private computeDesired(): void {
    this.desired
      .copy(this.offset)
      .applyQuaternion(this.target.quaternion)
      .add(this.target.position);

    this.forward.set(0, 0, -1).applyQuaternion(this.target.quaternion);
    this.lookDesired.copy(this.target.position).addScaledVector(this.forward, this.lookAhead);
    this.lookDesired.y += 1.5;
  }
}