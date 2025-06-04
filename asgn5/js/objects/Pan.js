import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { meshToTrimesh } from "../lib/helper.js";

export default class Pan extends THREE.Object3D {
  constructor() {
    super();
    this.name = "pan";
    const loader = new GLTFLoader();
    loader.load(
      "assets/models/Pan.glb",
      (gltf) => this.onReady(gltf),
      undefined,
      (error) => {
        console.error(`An error occurred while loading pan:`, error);
      }
    );
    this.position.set(0, 0.4, 1.25);
    this.rotation.set(0, 0, 0);
    this.targetPosition = this.position.clone();
    this.targetRotation = this.rotation.clone();
    this.ready = false;
  }

  onReady(gltf) {
    this.mesh = gltf.scene.children[0].children[0];
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.material.roughness = 0.1; // Set roughness for the pan

    this.add(this.mesh);
    this.ready = true;
  }

  setupPhysics(world) {
    // physics
    this.colliderDesc = meshToTrimesh(this.mesh)
      //.setContactSkin(0.25)
      .setMass(100)
      .setFriction(0.5)
      .setRestitution(0.5);

    this.rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setCcdEnabled(true)
      .setTranslation(this.position.x, this.position.y, this.position.z)
      .setRotation({
        x: this.rotation.x,
        y: this.rotation.y,
        z: this.rotation.z,
        w: 1,
      });

    this.rigidBody = world.createRigidBody(this.rigidBodyDesc);
    world.createCollider(this.colliderDesc, this.rigidBody);
  }

  onMouse(event) {
    let x = (event.clientX / window.innerWidth) * 2.5 - 1.25;
    let y = -(event.clientY / window.innerHeight) * 2.5 + 1.25;

    x = Math.min(Math.max(x, -1), 1); // Clamp x to [-1, 1]
    y = Math.min(Math.max(y, -1), 1); // Clamp y to [-1, 1]

    // Set rotation/position based on mouse position
    // (moving upwards so that the pan does not clip into the stove)
    // Set the target position/rotation in an attempt to prevent clipping
    this.targetRotation.set(y * Math.PI * 0.1, 0, x * Math.PI * 0.1);
    this.targetPosition.set(
      x * 0.5,
      0.5 + Math.max(Math.abs(x) * 0.1, Math.abs(y) * 0.4),
      1.25
    );
  }
}
