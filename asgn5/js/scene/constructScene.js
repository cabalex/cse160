import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

async function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        resolve(gltf.scene.children[0].children);
      },
      undefined,
      (error) => {
        console.error(`An error occurred while loading model ${path}:`, error);
        reject(error);
      }
    );
  });
}

export default async function constructScene(scene) {
  let loadIndex = 0;
  const placeObject = (objects, name, props) => {
    const object = objects.find((obj) => obj.name === name);
    if (object) {
      const clone = object.clone();
      if (props.scale) clone.scale.set(...props.scale);
      if (props.position) clone.position.set(...props.position);
      if (props.rotation) clone.rotation.set(...props.rotation);
      scene.add(clone);
      return clone;
    } else {
      console.warn(`Object with name ${name} not found.`);
      return null;
    }
  };

  // load skybox
  const loader = new THREE.TextureLoader();
  const texture = loader.load("assets/images/skybox.jpg", () => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    loadIndex++;
  });

  // load kitchen
  loadModel("assets/models/Modular Kitchen Parts.glb").then((counters) => {
    counters.forEach((c) => {
      c.receiveShadow = true;
      c.castShadow = true;
    });
    placeObject(counters, "kitchencounter_sink_backsplash", {
      position: [-2, -1, 0],
    });
    placeObject(counters, "kitchencounter_straight_decorated", {
      position: [2, -1, 0],
    });
    placeObject(counters, "kitchencounter_straight_A_backsplash", {
      position: [-4, -1, 0],
    });
    placeObject(counters, "kitchencounter_outercorner_backsplash", {
      position: [-5, -1, 0],
      rotation: [0, Math.PI / 2, 0],
    });
    loadIndex++;
  });

  // load walls
  loadModel("assets/models/Modular Walls.glb").then((walls) => {
    // front wall
    placeObject(walls, "wall_orderwindow_decorated", {
      position: [0, -0.99, -1.24],
    });
    placeObject(walls, "wall", { position: [-4, -1, -1.25] });
    placeObject(walls, "wall", { position: [4, -1, -1.25] });
    placeObject(walls, "wall", { position: [-4, -5, -1.25] });
    placeObject(walls, "wall", { position: [4, -5, -1.25] });
    placeObject(walls, "wall", { position: [0, -5, -1.25] });
    // left wall
    placeObject(walls, "wall", {
      position: [-6, -5, 5],
      scale: [400, 100, 100],
      rotation: [0, Math.PI / 2, 0],
    });
    placeObject(walls, "wall", {
      position: [-6, -1, 5],
      scale: [400, 100, 100],
      rotation: [0, Math.PI / 2, 0],
    });
    // right wall
    placeObject(walls, "wall", {
      position: [6, -5, 5],
      scale: [400, 100, 100],
      rotation: [0, -Math.PI / 2, 0],
    });
    placeObject(walls, "wall", {
      position: [6, -1, 5],
      scale: [400, 100, 100],
      rotation: [0, -Math.PI / 2, 0],
    });
    loadIndex++;
  });

  loadModel("assets/models/Floor Kitchen.glb").then((floor) => {
    floor[0].receiveShadow = true;
    placeObject(floor, "floor_kitchen", { position: [0, -2, 1] });
    placeObject(floor, "floor_kitchen", { position: [-4, -2, 1] });
    placeObject(floor, "floor_kitchen", { position: [4, -2, 1] });
    placeObject(floor, "floor_kitchen", { position: [0, -2, 5] });
    placeObject(floor, "floor_kitchen", { position: [-4, -2, 5] });
    placeObject(floor, "floor_kitchen", { position: [4, -2, 5] });
    loadIndex++;
  });

  loadModel("assets/models/Stove Single.glb").then((stove) => {
    const stoveObj = placeObject(stove, "stove_single", {
      position: [0, -1, 0],
    });
    stoveObj.castShadow = true;
    stoveObj.receiveShadow = true;
    loadIndex++;
  });

  loadModel("assets/models/Fridge.glb").then((stove) => {
    const fridgeObj = placeObject(stove, "fridge_A_decorated", {
      position: [-5, -1.5, 2],
      scale: [100, 125, 100],
      rotation: [0, Math.PI / 2, 0],
    });
    fridgeObj.castShadow = true;
    fridgeObj.receiveShadow = true;
    loadIndex++;
  });

  loadModel("assets/models/Crate of Ham.glb").then((stove) => {
    placeObject(stove, "crate_ham", {
      position: [4, -0.5, 0],
    });
    placeObject(stove, "crate_ham", {
      position: [4, 0.25, 0],
    });
    placeObject(stove, "crate_ham", {
      position: [5, -1.5, 2],
      rotation: [0, Math.PI / 2, 0],
    });
    placeObject(stove, "crate_ham", {
      position: [-5, 0.45, 0],
      rotation: [0, 0, -Math.PI / 4],
    });
    loadIndex++;
  });

  // box to hide bottom of counter
  const boxGeometry = new THREE.BoxGeometry(20, 1.5, 1.5);
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.name = "box";
  box.position.set(0, -1.25, 0);
  box.receiveShadow = true;
  scene.add(box);

  // capsule
  const capsuleGeometry = new THREE.CapsuleGeometry(0.05, 0.1, 32, 8);
  const capsuleMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.5,
    metalness: 0,
  });
  const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
  capsule.name = "capsule";
  capsule.position.set(2.25, 0.2, 0.5);
  capsule.rotation.set(0, Math.PI / 4, Math.PI / 2);
  capsule.castShadow = true;
  capsule.receiveShadow = true;
  scene.add(capsule);

  // ceiling
  const ceilingGeometry = new THREE.PlaneGeometry(10, 10);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.5,
    metalness: 0,
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.name = "ceiling";
  ceiling.rotation.x = Math.PI / 2; // Rotate to face downwards
  ceiling.position.set(0, 2.5, 4);
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  // ambient light
  const ambientLight = new THREE.AmbientLight(0x444466, 0.2);
  ambientLight.name = "ambientLight";
  scene.add(ambientLight);

  // outside light
  const outsideLight = new THREE.DirectionalLight(0xffffff, 1);
  outsideLight.name = "outsideLight";
  outsideLight.position.set(0, 0, -10);
  outsideLight.castShadow = true;
  outsideLight.shadow.mapSize.width = 1024;
  outsideLight.shadow.mapSize.height = 1024;
  scene.add(outsideLight);

  const stoveLight = new THREE.PointLight(0xffa500, 1, 2);
  stoveLight.name = "stoveLight";
  stoveLight.position.set(0, 0.2, 0);
  stoveLight.castShadow = true;
  stoveLight.shadow.camera.near = 0.1;
  stoveLight.shadow.camera.far = 20;
  stoveLight.shadow.mapSize.width = 1024;
  stoveLight.shadow.mapSize.height = 1024;
  scene.add(stoveLight);

  // Overhead light
  const overheadLightColor = 0xffffaa;
  const overheadLightObj = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 4),
    new THREE.MeshBasicMaterial({
      color: overheadLightColor,
    })
  );
  const overheadLight = new THREE.SpotLight(
    overheadLightColor,
    2,
    0,
    Math.PI / 4,
    0.3,
    1.5
  );
  overheadLight.castShadow = true;
  overheadLight.position.set(0, 0.1, 0);
  overheadLightObj.name = "overheadLight";
  const overheadLightFrame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.5, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  overheadLight.shadow.mapSize.width = 1024;
  overheadLight.shadow.mapSize.height = 1024;
  overheadLight.shadow.intensity = 0.5;

  overheadLightFrame.position.set(0, 0.1, 0);
  overheadLightFrame.castShadow = true;
  overheadLightObj.add(overheadLight);
  overheadLight.target = overheadLightObj; // need to set target so it rotates with the frame
  overheadLightObj.add(overheadLightFrame);
  overheadLightObj.position.set(0, 2, 0);
  scene.add(overheadLightObj);

  const cameraLight = new THREE.PointLight(0xffffff, 0.5);
  cameraLight.name = "cameraLight";
  cameraLight.position.set(0, 1, 4);
  cameraLight.castShadow = true;
  cameraLight.shadow.mapSize.width = 1024;
  cameraLight.shadow.mapSize.height = 1024;
  scene.add(cameraLight);

  await new Promise((resolve) => {
    const checkLoad = setInterval(() => {
      if (loadIndex >= 5) {
        clearInterval(checkLoad);
        resolve();
      }
    }, 100);
  });
  console.log("Scene constructed successfully");
}
