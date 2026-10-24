import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export class Car {
  /** Pivote que se mueve y rota. El modelo 3D va adentro. */
  readonly object = new THREE.Group();
  /** Radio de colisión (en el plano XZ). */
  readonly radius = 1.6;

  maxSpeed = 22;
  accel = 25;
  drag = 12;
  turnRate = 2;

  private heading = 0;
  private speed = 0;
  private readonly forward = new THREE.Vector3();

  constructor(model: THREE.Object3D) {
    this.object.add(model);
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  update(dt: number, throttle: number, steer: number): void {
    if (throttle !== 0) {
      this.speed += throttle * this.accel * dt;
    } else {
      const d = this.drag * dt; // fricción hacia 0
      this.speed = Math.abs(this.speed) <= d ? 0 : this.speed - Math.sign(this.speed) * d;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed / 3, this.maxSpeed);

    const speedFactor = this.speed / this.maxSpeed; // 0 detenido, negativo en reversa
    this.heading += steer * this.turnRate * speedFactor * dt;

    this.forward.set(0, 0, -1).applyAxisAngle(UP, this.heading); // -Z es el frente
    this.object.position.addScaledVector(this.forward, this.speed * dt);
    this.object.rotation.y = this.heading;
  }

  get speedVal(): number {
    return this.speed;
  }

  /** Se llama al chocar: pierde la mayor parte de la velocidad. */
  bump(): void {
    this.speed *= 0.3;
  }

  stop(): void {
    this.speed = 0;
  }

  teleport(x: number, z: number, heading = 0): void {
    this.object.position.set(x, 0, z);
    this.heading = heading;
    this.object.rotation.y = heading;
    this.speed = 0;
  }

  setBlink(visible: boolean): void {
    this.object.visible = visible;
  }
}

/** Carrito provisional hecho con primitivas. Se reemplaza luego por un modelo GLB. */
export function createPlaceholderCar(): THREE.Object3D {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xff5533, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.2 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), paint);
  body.position.y = 0.7;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2), glass);
  cabin.position.set(0, 1.45, 0.3); // un poco hacia atrás: el frente es -Z
  car.add(body, cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1.3, 1.3]) {
      const wheel = new THREE.Mesh(wheelGeo, tire);
      wheel.position.set(sx * 1.05, 0.4, sz);
      car.add(wheel);
    }
  }
  return car;
}
