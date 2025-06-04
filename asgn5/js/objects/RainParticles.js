import * as THREE from "three";

export default class RainParticles extends THREE.Points {
  constructor(maxParticles = 200) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < maxParticles; i++) {
      const x = Math.random() * 4 - 2; // Random x position between -1 and 1
      const y = Math.random() * 10 - 5; // Random y position between 5 and 7
      const z = Math.random() * 2 - 4; // Random z position between -1 and 1

      vertices.push(x, y, z);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      color: 0x9999aa,
    });

    super(geometry, material);
    this.started = false;
    this.name = "rainParticles";
    this.position.set(0, 0, 0);
    this.geometry.computeBoundingSphere();
    this.geometry.setDrawRange(0, maxParticles);
  }

  update() {
    const position = this.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      let y = position.getY(i);
      if (y < -5) {
        y = 5;
      }
      position.setY(i, y - 0.1);
    }
    position.needsUpdate = true;
  }
}
