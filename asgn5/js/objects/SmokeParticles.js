import * as THREE from "three";

export default class SmokeParticles extends THREE.Points {
  constructor(maxParticles = 100) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const lifetimes = new Uint8Array(new Array(maxParticles).fill(0));

    for (let i = 0; i < maxParticles; i++) {
      const x = 0;
      const y = 0;
      const z = 0;

      vertices.push(x, y, z);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.25,
      sizeAttenuation: true,
      transparent: true,
      color: 0x111111,
    });

    super(geometry, material);
    this.started = false;
    this.name = "particles";
    this.position.set(0, 0, 0);
    this.geometry.computeBoundingSphere();
    this.geometry.setDrawRange(0, maxParticles);
    this.lifetimes = lifetimes;
  }

  update() {
    const position = this.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      if (this.lifetimes[i] > 0) {
        this.lifetimes[i]--;
        position.setY(i, position.getY(i) + 0.02);
      } else {
        position.setXYZ(i, 0, -2, 0); // reset position if lifetime is over
      }
    }
    position.needsUpdate = true;
  }

  start(pos) {
    this.started = true;
    // add a particle
    const position = this.geometry.getAttribute("position");
    for (let i = 0; i < this.lifetimes.length; i++) {
      if (this.lifetimes[i] === 0) {
        this.lifetimes[i] = 100 * Math.random(); // set lifetime to 100 frames
        position.setXYZ(
          i,
          pos.x + Math.random() * 0.2,
          pos.y,
          pos.z + Math.random() * 0.2
        ); // reset position
        break;
      }
    }

    this.update();
  }

  stop() {
    this.started = false;
    this.update();
  }
}
