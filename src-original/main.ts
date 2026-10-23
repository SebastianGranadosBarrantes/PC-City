import * as THREE from 'three';
import './style.css';

const UP = new THREE.Vector3(0, 1, 0);

// ---------- Input: which keys are down ----------
class Input {
  private keys = new Set<string>();
  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear()); // avoid stuck keys
  }
  private down(...codes: string[]) { return codes.some((c) => this.keys.has(c)); }
  get throttle() { return Number(this.down('KeyW', 'ArrowUp')) - Number(this.down('KeyS', 'ArrowDown')); }
  get steer()    { return Number(this.down('KeyA', 'ArrowLeft')) - Number(this.down('KeyD', 'ArrowRight')); }
}

// ---------- Car: knows nothing about the keyboard ----------
class Car {
  readonly object = new THREE.Group(); // the "pivot" that moves and rotates
  private heading = 0;
  private speed = 0;
  private forward = new THREE.Vector3();
  maxSpeed = 20; accel = 25; drag = 12; turnRate = 2;

  constructor(model: THREE.Object3D) { this.object.add(model); }

  update(dt: number, throttle: number, steer: number) {
    if (throttle !== 0) {
      this.speed += throttle * this.accel * dt;
    } else {
      const d = this.drag * dt; // friction toward zero
      this.speed = Math.abs(this.speed) <= d ? 0 : this.speed - Math.sign(this.speed) * d;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed / 3, this.maxSpeed);

    const speedFactor = this.speed / this.maxSpeed; // 0 when stopped, negative in reverse
    this.heading += steer * this.turnRate * speedFactor * dt;

    this.forward.set(0, 0, -1).applyAxisAngle(UP, this.heading); // -Z is "front"
    this.object.position.addScaledVector(this.forward, this.speed * dt);
    this.object.rotation.y = this.heading;
  }
}

// ---------- Chase camera ----------
class ChaseCamera {
  private offset = new THREE.Vector3(0, 6, 12); // behind (+Z) and above
  private desired = new THREE.Vector3();
  constructor(private camera: THREE.PerspectiveCamera, private target: THREE.Object3D) {}
  update(dt: number) {
    this.desired.copy(this.offset).applyQuaternion(this.target.quaternion).add(this.target.position);
    this.camera.position.lerp(this.desired, 1 - Math.exp(-5 * dt)); // smooth, frame-rate independent
    this.camera.lookAt(this.target.position);
  }
}

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x4a7c59 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground, new THREE.GridHelper(400, 100)); // grid helps you SEE the movement

const box = new THREE.Mesh(                      // longer in Z so you can tell the front
  new THREE.BoxGeometry(2, 1, 4),
  new THREE.MeshStandardMaterial({ color: 0xff5533 }),
);
box.position.y = 0.5;                            // sit on the ground

const car = new Car(box);
scene.add(car.object);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const chase = new ChaseCamera(camera, car.object);
const input = new Input();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Loop ----------
let last = 0;
renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - last) / 1000, 0.05); // clamp: avoids a huge jump after a tab switch
  last = time;
  car.update(dt, input.throttle, input.steer);
  chase.update(dt);
  renderer.render(scene, camera);
});