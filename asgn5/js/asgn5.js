import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";
import Steak from "./objects/Steak.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import constructScene from "./scene/constructScene.js";
import animateScene from "./scene/animateScene.js";
import Pan from "./objects/Pan.js";
import SmokeParticles from "./objects/SmokeParticles.js";
import RainParticles from "./objects/RainParticles.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();

renderer.shadowMap.enabled = true;
renderer.shadowMapType = THREE.PCFSoftShadowMap;

// better colors
THREE.ColorManagement.enabled = true;
THREE.ColorManagement.legacyMode = false;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.enablePan = false;
controls.minDistance = 1;
controls.maxDistance = 4;
controls.minAzimuthAngle = -Math.PI / 2;
controls.maxAzimuthAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 8;
controls.maxPolarAngle = Math.PI / 2;

camera.position.set(0, 2, 4);
controls.target.set(0, 0.5, 0);
controls.update();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const steak = new Steak();
const pan = new Pan();

async function setup() {
  await RAPIER.init();
  await constructScene(scene);
  while (!pan.ready) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  scene.add(steak);
  scene.add(pan);
  scene.add(new SmokeParticles());
  scene.add(new RainParticles());
  const world = new RAPIER.World({ x: 0, y: -5.82, z: 0 });
  steak.setupPhysics(world);
  pan.setupPhysics(world);

  animateScene(scene, camera, renderer, world);
}
setup();
