import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { Rotacion } from "../types";

export interface Size {
  ancho: number;
  alto: number;
  fondo: number;
}

export interface FittedModel {
  object: THREE.Object3D; // escalado, centrado en X/Z y apoyado en y = 0
  size: THREE.Vector3; // tamaño real que quedó
}

// Configurar DRACOLoader para modelos con compresión KHR_draco_mesh_compression
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/gltf/`);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

export async function loadFittedModel(
  filePath: string,
  target: Size,
  rotacion?: Rotacion,
): Promise<FittedModel> {
  const gltf = await loader.loadAsync(import.meta.env.BASE_URL + filePath);
  return fitToSize(gltf.scene, target, rotacion);
}

export function fitToSize(
  model: THREE.Object3D,
  target: Size,
  rotacion?: Rotacion,
): FittedModel {
  // Primero se rota y después se mide, así el ajuste trabaja con la forma ya orientada.
  if (rotacion) {
    model.rotation.order = "YXZ"; // z y x levantan, y gira al final sobre el eje vertical
    model.rotation.set(
      THREE.MathUtils.degToRad(rotacion.x ?? 0),
      THREE.MathUtils.degToRad(rotacion.y ?? 0),
      THREE.MathUtils.degToRad(rotacion.z ?? 0),
    );
  }

  const box = new THREE.Box3().setFromObject(model);
  const dims = box.getSize(new THREE.Vector3());

  const scale = Math.min(
    target.ancho / Math.max(dims.x, 1e-6),
    target.alto / Math.max(dims.y, 1e-6),
    target.fondo / Math.max(dims.z, 1e-6),
  );
  model.scale.multiplyScalar(scale);

  box.setFromObject(model); // medir de nuevo con la escala aplicada
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  const object = new THREE.Group();
  object.add(model);
  return { object, size: box.getSize(new THREE.Vector3()) };
}
