import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";

const image = new Image();
image.src = "assets/images/meat.jpg";

const normals = [
  new THREE.Vector3(1, 0, 0), // right
  new THREE.Vector3(-1, 0, 0), // left
  new THREE.Vector3(0, 1, 0), // up
  new THREE.Vector3(0, -1, 0), // down
  new THREE.Vector3(0, 0, 1), // front
  new THREE.Vector3(0, 0, -1), // back
];

export default class Steak extends THREE.Object3D {
  constructor() {
    super();
    this.name = "steak";
    this.geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);

    // texture
    this.canvases = [];
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#" + ((Math.random() * 0xffffff) | 0).toString(16);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.canvases.push(ctx);
    }

    // Sorta hack: different materials for each face
    // Probably bad for performance, but UV mapping is a pain
    this.materials = [];
    for (let ctx of this.canvases) {
      const texture = new THREE.CanvasTexture(ctx.canvas);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        normalMap: new THREE.TextureLoader().load(
          "assets/images/meat_normal.jpg"
        ),
        bumpMap: new THREE.TextureLoader().load(
          "assets/images/meat_specular.jpg"
        ),
        roughness: 0.5,
        metalness: 0,
      });
      this.materials.push(material);
    }
    this.mesh = new THREE.Mesh(this.geometry, this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
    this.position.set(0, 2, 0); // position the steak above the stove

    // for calculating cooking
    this._normalMatrix = new THREE.Matrix3();
    this._worldNormal = new THREE.Vector3();
    this.cooked = [0, 0, 0, 0, 0, 0];
    this.maxCooking = 100;
    this.burning = false;

    if (!image.complete) {
      image.onload = () => {
        this.canvases.forEach((ctx) => {
          ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
        });
        this.materials.forEach((material) => {
          material.map.needsUpdate = true; // Update the texture
        });
      };
    } else {
      this.canvases.forEach((ctx) => {
        ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
      });
    }
  }

  get cookProgress() {
    // Calculate the average cooking progress across all sides
    const totalCooked = this.cooked.reduce(
      (sum, value) => sum + Math.min(this.maxCooking, value),
      0
    );
    return totalCooked / (this.maxCooking * this.cooked.length);
  }

  update() {
    // get distance to burner
    const distance = this.position.distanceTo(new THREE.Vector3(0, 0.5, 0));
    const effectiveness = Math.min(1, Math.max(0, 1 / (distance * 4))); // Effectiveness decreases with distance
    if (effectiveness < 0.4) {
      // Not close enough to burner to cook
      this.burning = false;
      return;
    }

    // figure out which side is being cooked (downward)
    // get the dot products of all the normals
    this._normalMatrix.getNormalMatrix(this.mesh.matrixWorld);

    let cookingIndex = 0;
    let cookingValue = 0;
    for (let i = 0; i < 6; i++) {
      let alignment = this._worldNormal
        .copy(normals[i])
        .applyMatrix3(this._normalMatrix)
        .normalize()
        .dot(new THREE.Vector3(0, -1, 0));

      if (alignment > cookingValue) {
        cookingValue = alignment;
        cookingIndex = i;
      }
    }

    const ctx = this.canvases[cookingIndex];
    this.cooked[cookingIndex] += effectiveness * cookingValue; // Increase cooking value based on effectiveness

    this.burning = this.cooked[cookingIndex] >= this.maxCooking * 1.1;

    ctx.globalCompositeOperation = "source-over"; // Reset composite operation
    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
    // tint the image based on cooking value
    const tint = Math.min(2, this.cooked[cookingIndex] / this.maxCooking);
    ctx.globalCompositeOperation = "multiply"; // Apply tint
    ctx.fillStyle = `rgb(${230 * (2 - tint) + 25}, ${128 * (2 - tint)}, ${
      128 * (2 - tint)
    })`; // Red tint for cooking
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.materials[cookingIndex].map.needsUpdate = true; // Update the texture
  }

  setupPhysics(world) {
    // physics
    this.colliderDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1)
      .setFriction(0.2)
      .setRestitution(0.5)
      .setMass(20);

    this.rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setCcdEnabled(true)
      .setTranslation(this.position.x, this.position.y, this.position.z);
    this.rigidBody = world.createRigidBody(this.rigidBodyDesc);
    world.createCollider(this.colliderDesc, this.rigidBody);
  }

  // reset position and cooking state
  reset() {
    console.log("Resetting steak");
    this.rigidBody.setTranslation({ x: 0, y: 2, z: 0 }, true);
    this.rigidBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 });
    this.cooked = [0, 0, 0, 0, 0, 0];
    this.canvases.forEach((ctx, i) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
      this.materials[i].map.needsUpdate = true;
    });
  }
}
