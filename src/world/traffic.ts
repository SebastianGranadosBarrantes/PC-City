import * as THREE from 'three';

export interface Waypoint {
  x: number;
  z: number;
}

export interface TrafficCarConfig {
  name: string;
  color: number;
  route: Waypoint[];
  speed: number;
  startIndex?: number;
}

function shortestAngleDiff(target: number, current: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export class TrafficCar {
  readonly mesh: THREE.Group;
  readonly radius = 1.4;
  readonly speed: number;
  readonly route: Waypoint[];

  currentSpeed = 0;
  heading = 0;
  waypointIndex = 0;
  brakeTimer = 0;

  // Sistema anti-atascamiento (Anti-Stuck Watchdog)
  private readonly lastPos = new THREE.Vector3();
  private stuckTimer = 0;

  private readonly wheels: THREE.Mesh[] = [];

  constructor(config: TrafficCarConfig) {
    this.speed = config.speed;
    this.route = config.route;
    this.waypointIndex = config.startIndex ?? 0;

    this.mesh = this.createMesh(config.color);

    // Posición y orientación inicial
    const start = this.route[this.waypointIndex];
    const next = this.route[(this.waypointIndex + 1) % this.route.length];
    this.mesh.position.set(start.x, 0, start.z);
    this.lastPos.copy(this.mesh.position);

    const dx = next.x - start.x;
    const dz = next.z - start.z;
    this.heading = Math.atan2(-dx, -dz);
    this.mesh.rotation.y = this.heading;
    this.currentSpeed = this.speed;
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  private createMesh(color: number): THREE.Group {
    const group = new THREE.Group();

    // Materiales
    const paint = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.25,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.7,
    });
    const tire = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
    });
    const headlight = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const taillight = new THREE.MeshBasicMaterial({ color: 0xff2222 });

    // Carrocería principal (Box 2.0 x 0.75 x 3.6)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 3.6), paint);
    body.position.y = 0.65;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cabina (Box 1.6 x 0.65 x 1.9)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 1.9), glass);
    cabin.position.set(0, 1.25, 0.15); // frente hacia -Z
    cabin.castShadow = true;
    group.add(cabin);

    // Ruedas (Cilindros)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const sx of [-1.05, 1.05]) {
      for (const sz of [-1.15, 1.15]) {
        const wheel = new THREE.Mesh(wheelGeo, tire);
        wheel.position.set(sx, 0.38, sz);
        group.add(wheel);
        this.wheels.push(wheel);
      }
    }

    // Luces delanteras (hacia -Z)
    for (const sx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), headlight);
      hl.position.set(sx, 0.66, -1.82);
      group.add(hl);
    }

    // Luces traseras (hacia +Z)
    for (const sx of [-0.65, 0.65]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), taillight);
      tl.position.set(sx, 0.7, 1.82);
      group.add(tl);
    }

    return group;
  }

  update(dt: number, otherCars: TrafficCar[]): void {
    // 1. Anti-Stuck Watchdog: si el auto está detenido por más de 1.8 segundos, forzar avance
    const distMoved = this.position.distanceTo(this.lastPos);
    if (distMoved < 0.25) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.8) {
        this.waypointIndex = (this.waypointIndex + 1) % this.route.length;
        this.brakeTimer = 0;
        this.currentSpeed = this.speed * 0.75;
        this.stuckTimer = 0;
        this.lastPos.copy(this.position);
      }
    } else {
      this.stuckTimer = 0;
      this.lastPos.copy(this.position);
    }

    // 2. Detección inteligente de autos adelante
    let targetSpeed = this.speed;

    if (this.brakeTimer > 0) {
      this.brakeTimer -= dt;
      targetSpeed = 0;
    } else {
      for (const other of otherCars) {
        if (other === this) continue;

        const dx = other.position.x - this.position.x;
        const dz = other.position.z - this.position.z;
        const distSq = dx * dx + dz * dz;

        // Solo autos en un radio de 8 metros
        if (distSq < 64) {
          // Si el otro auto viaja en sentido contrario (carril adyacente), IGNORAR
          const headingDiff = Math.abs(shortestAngleDiff(other.heading, this.heading));
          if (headingDiff > 1.2) {
            continue;
          }

          // Verificar si el otro auto está enfrente en el cono de visión (+/- 35 grados)
          const toOtherAngle = Math.atan2(-dx, -dz);
          const angleDiff = Math.abs(shortestAngleDiff(toOtherAngle, this.heading));

          if (angleDiff < 0.65) {
            const dist = Math.sqrt(distSq);
            if (dist < 4.2) {
              // Muy cerca: desacelerar, manteniendo velocidad mínima de fluidez
              targetSpeed = Math.min(targetSpeed, Math.max(2.0, other.currentSpeed * 0.5));
            } else {
              // Rango de seguimiento normal (4.2m a 8m): adaptar velocidad
              targetSpeed = Math.min(targetSpeed, Math.max(3.0, other.currentSpeed * 0.9));
            }
          }
        }
      }
    }

    // Aceleración y frenado suaves
    if (this.currentSpeed > targetSpeed) {
      this.currentSpeed = Math.max(targetSpeed, this.currentSpeed - 16 * dt);
    } else {
      this.currentSpeed = Math.min(targetSpeed, this.currentSpeed + 10 * dt);
    }

    // 3. Navegación hacia el waypoint objetivo
    const target = this.route[this.waypointIndex];
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const distToTarget = Math.hypot(dx, dz);

    // Margen amplio de llegada al waypoint (3.2m) para evitar giros truncados
    if (distToTarget < 3.2) {
      this.waypointIndex = (this.waypointIndex + 1) % this.route.length;
    }

    // Girar suavemente hacia el waypoint
    const targetHeading = Math.atan2(-dx, -dz);
    const diff = shortestAngleDiff(targetHeading, this.heading);
    const turnRate = 5.5; // radianes por segundo
    const step = Math.min(Math.abs(diff), turnRate * dt) * Math.sign(diff);
    this.heading += step;

    // Desplazamiento
    const fwdX = -Math.sin(this.heading);
    const fwdZ = -Math.cos(this.heading);
    this.position.x += fwdX * this.currentSpeed * dt;
    this.position.z += fwdZ * this.currentSpeed * dt;
    this.mesh.rotation.y = this.heading;

    // Rotación de las ruedas
    const wheelRot = (this.currentSpeed / 0.38) * dt;
    for (const w of this.wheels) {
      w.rotation.x += wheelRot;
    }
  }

  brake(duration = 1.0): void {
    this.brakeTimer = duration;
  }
}

/**
 * Gestor del tráfico urbano en las calles de Ciudad PC.
 * Mantiene autos circulando de forma fluida y continua sin atascos.
 */
export class TrafficSystem {
  readonly cars: TrafficCar[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initRoutesAndCars();
  }

  private initRoutesAndCars(): void {
    // Definición de carriles estrictamente conforme al sentido de la derecha:
    // Avenida Central (Z=0, ancho 12):
    //   - Hacia el Este (+X): Z = +2.8
    //   - Hacia el Oeste (-X): Z = -2.8
    // Avenida Central (X=0, ancho 12):
    //   - Hacia el Sur (+Z): X = -2.8
    //   - Hacia el Norte (-Z): X = +2.8
    // Calles secundarias (ancho 8, offset 2.0):
    //   - Calle Norte (Z=-65): Este Z = -63.0 | Oeste Z = -67.0
    //   - Calle Sur (Z=85):    Este Z = +87.0 | Oeste Z = +83.0
    //   - Calle Oeste (X=-105): Sur X = -107.0 | Norte X = -103.0
    //   - Calle Este (X=105):   Sur X = +103.0 | Norte X = +107.0

    // Circuito 1: Bloque Sureste (Sentido horario)
    const rutaSureste: Waypoint[] = [
      { x: 2.8, z: 2.8 },      // Este por Avenida Central
      { x: 103.0, z: 2.8 },    // Cruce hacia Calle Este
      { x: 103.0, z: 83.0 },   // Sur por Calle Este
      { x: 2.8, z: 83.0 },     // Oeste por Calle Sur
      { x: 2.8, z: 2.8 },      // Norte por Avenida Central
    ];

    // Circuito 2: Bloque Suroeste (Sentido horario)
    const rutaSuroeste: Waypoint[] = [
      { x: -103.0, z: 83.0 },  // Norte por Calle Oeste
      { x: -103.0, z: 2.8 },   // Cruce hacia Avenida Central
      { x: -2.8, z: 2.8 },     // Este por Avenida Central
      { x: -2.8, z: 83.0 },    // Sur por Avenida Central
      { x: -103.0, z: 83.0 },  // Oeste por Calle Sur
    ];

    // Circuito 3: Bloque Noreste (Sentido horario)
    const rutaNoreste: Waypoint[] = [
      { x: 2.8, z: -2.8 },     // Norte por Avenida Central
      { x: 2.8, z: -63.0 },    // Cruce hacia Calle Norte
      { x: 103.0, z: -63.0 },  // Este por Calle Norte
      { x: 103.0, z: -2.8 },   // Sur por Calle Este
      { x: 2.8, z: -2.8 },     // Oeste por Avenida Central
    ];

    // Circuito 4: Bloque Noroeste (Sentido horario)
    const rutaNoroeste: Waypoint[] = [
      { x: -2.8, z: -2.8 },    // Oeste por Avenida Central
      { x: -107.0, z: -2.8 },  // Cruce hacia Calle Oeste
      { x: -103.0, z: -63.0 }, // Norte por Calle Oeste
      { x: -2.8, z: -63.0 },   // Este por Calle Norte
      { x: -2.8, z: -2.8 },    // Sur por Avenida Central
    ];

    // Circuito 5: Gran Perímetro Exterior (Sentido horario)
    const rutaPerimetro: Waypoint[] = [
      { x: -103.0, z: -63.0 }, // Toda la Calle Norte hacia el Este
      { x: 103.0, z: -63.0 },
      { x: 103.0, z: 83.0 },   // Toda la Calle Este hacia el Sur
      { x: -103.0, z: 83.0 },  // Toda la Calle Sur hacia el Oeste
      { x: -103.0, z: -63.0 }, // Toda la Calle Oeste hacia el Norte
    ];

    // Circuito 6: Avenida Central Este-Oeste completa con retorno
    const rutaAvenidaEW: Waypoint[] = [
      { x: -110.0, z: 2.8 },   // Todo el carril Este (+X)
      { x: 110.0, z: 2.8 },
      { x: 110.0, z: -2.8 },   // Retorno al carril Oeste (-X)
      { x: -110.0, z: -2.8 },
    ];

    // Flota de 8 vehículos de tráfico con variedad de colores y puntos iniciales separados
    const configs: TrafficCarConfig[] = [
      { name: 'Taxi Amarillo', color: 0xfacc15, route: rutaSureste, speed: 11.5, startIndex: 0 },
      { name: 'Sedán Azul', color: 0x2563eb, route: rutaSuroeste, speed: 10.5, startIndex: 1 },
      { name: 'Deportivo Rojo', color: 0xef4444, route: rutaNoreste, speed: 13.0, startIndex: 2 },
      { name: 'Minivan Blanca', color: 0xf8fafc, route: rutaNoroeste, speed: 10.0, startIndex: 0 },
      { name: 'Coupé Naranja', color: 0xf97316, route: rutaPerimetro, speed: 12.0, startIndex: 0 },
      { name: 'Camioneta Cian', color: 0x06b6d4, route: rutaPerimetro, speed: 11.5, startIndex: 2 },
      { name: 'Compacto Verde', color: 0x10b981, route: rutaAvenidaEW, speed: 12.0, startIndex: 0 },
      { name: 'Hatchback Morado', color: 0xa855f7, route: rutaAvenidaEW, speed: 11.0, startIndex: 2 },
    ];

    for (const cfg of configs) {
      const car = new TrafficCar(cfg);
      this.cars.push(car);
      this.scene.add(car.mesh);
    }
  }

  /**
   * Actualiza el movimiento del tráfico, separa vehículos y gestiona colisiones con el jugador.
   */
  update(
    dt: number,
    playerPos: THREE.Vector3,
    playerRadius: number,
    onPlayerHit?: () => void,
    isPaused = false,
  ): void {
    if (isPaused) return;

    // 1. Actualizar movimiento de cada auto
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].update(dt, this.cars);
    }

    // 2. Separación física entre autos de tráfico (evita que se toquen o encimen las defensas)
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const c1 = this.cars[i];
        const c2 = this.cars[j];
        const dx = c2.position.x - c1.position.x;
        const dz = c2.position.z - c1.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = c1.radius + c2.radius + 0.8; // margen seguro de 3.6m

        if (dist < minDist && dist > 0.001) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          c1.position.x -= nx * overlap;
          c1.position.z -= nz * overlap;
          c2.position.x += nx * overlap;
          c2.position.z += nz * overlap;
        }
      }
    }

    // 3. Colisión con el vehículo del jugador
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      const dx = playerPos.x - car.position.x;
      const dz = playerPos.z - car.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = playerRadius + car.radius;

      if (dist < minDist && dist > 0.001) {
        // Empujar al jugador fuera del auto de tráfico
        const overlap = minDist - dist;
        playerPos.x += (dx / dist) * overlap;
        playerPos.z += (dz / dist) * overlap;

        // El auto de tráfico frena momentáneamente
        car.brake(1.0);

        // Notificar impacto
        onPlayerHit?.();
      }
    }
  }
}
