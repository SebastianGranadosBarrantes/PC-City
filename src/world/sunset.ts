import * as THREE from 'three';

/**
 * Color cálido del horizonte para la niebla atmosférica y el fondo previo a la carga.
 */
export const SUNSET_FOG_COLOR = 0xd96843;

/**
 * Genera una textura equirrectangular para un cielo 3D de atardecer en 360°.
 * Combina un gradiente crepuscular completo con el resplandor y halo del sol poniente.
 */
export function createSunsetSky(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Gradiente vertical de cielo (cenit índigo -> violeta -> coral fuego -> horizonte dorado -> suelo)
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0.00, '#0f1228'); // Cenit: azul noche profundo
  grad.addColorStop(0.20, '#261b40'); // Azul violeta crepúsculo
  grad.addColorStop(0.38, '#57274e'); // Violeta cálido
  grad.addColorStop(0.53, '#94364e'); // Frambuesa / vino
  grad.addColorStop(0.68, '#d25334'); // Coral / fuego
  grad.addColorStop(0.79, '#f28935'); // Naranja atardecer
  grad.addColorStop(0.87, '#f9b852'); // Ámbar dorado en el horizonte
  grad.addColorStop(0.93, '#ffdf88'); // Resplandor brillante de horizonte
  grad.addColorStop(0.97, '#d96843'); // Haze que armoniza con la niebla
  grad.addColorStop(1.00, '#381f25'); // Base crepuscular bajo el horizonte
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Disco y halo solar en el horizonte (alineado con la luz solar direccional)
  const sunX = canvas.width * 0.65;
  const sunY = canvas.height * 0.81;

  // Gran halo atmosférico dorado
  const auraGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 320);
  auraGrad.addColorStop(0.0, 'rgba(255, 245, 205, 0.95)');
  auraGrad.addColorStop(0.18, 'rgba(255, 185, 80, 0.7)');
  auraGrad.addColorStop(0.42, 'rgba(240, 110, 50, 0.35)');
  auraGrad.addColorStop(0.72, 'rgba(200, 70, 40, 0.12)');
  auraGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
  ctx.fill();

  // Disco del sol poniente
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 44);
  sunGrad.addColorStop(0.0, '#ffffff');
  sunGrad.addColorStop(0.4, '#fff2a8');
  sunGrad.addColorStop(0.8, '#ffa842');
  sunGrad.addColorStop(1.0, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Añade luces complementarias con atmósfera de hora dorada / atardecer.
 */
export function setupSunsetLighting(scene: THREE.Scene): void {
  // 1. Luz hemisférica ambiental: cielo coral cálido arriba, suelo crepúsculo abajo
  const hemi = new THREE.HemisphereLight(0xff8c66, 0x2d2438, 1.45);
  scene.add(hemi);

  // 2. Sol del atardecer: ángulo bajo e iluminación dorada intensa
  const sun = new THREE.DirectionalLight(0xffa558, 2.7);
  sun.position.set(125, 38, -85);
  scene.add(sun);

  // 3. Luz de relleno crepuscular este (tonos violeta / lavanda suave en el lado opuesto)
  const duskFill = new THREE.DirectionalLight(0x7c6ba6, 0.85);
  duskFill.position.set(-110, 30, 90);
  scene.add(duskFill);
}
