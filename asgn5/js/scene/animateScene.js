import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";
import PerlinNoise from "../lib/noise.js";
import showResults from "./showResults.js";

const stats = new Stats();
document.body.appendChild(stats.dom);

export default function animateScene(scene, camera, renderer, world) {
  const overheadLight = scene.getObjectByName("overheadLight");
  const stoveLight = scene.getObjectByName("stoveLight");
  const pan = scene.getObjectByName("pan");
  const steak = scene.getObjectByName("steak");
  const particles = scene.getObjectByName("particles");
  const rainParticles = scene.getObjectByName("rainParticles");
  const cookBarElement = document.getElementById("cook-bar-progress");
  const cookBarLabel = document.getElementById("cook-bar-label");

  /*
  // debug pan to see if collider is being constructed correctly
  pan.mesh.material.wireframe = true;
  const verts = pan.rigidBody.colliderSet.map.data[1]._shape.vertices;
  const indices = pan.rigidBody.colliderSet.map.data[1]._shape.indices;
  // create 3js geometry from the vertices
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
  });
  const debugMesh = new THREE.Mesh(geometry, material);
  debugMesh.name = "debugMesh";
  debugMesh.position.copy(pan.position);
  debugMesh.quaternion.copy(pan.quaternion);
  scene.add(debugMesh);
  */

  window.addEventListener("mousemove", (event) => {
    if (pan) {
      pan.onMouse(event);
    }
  });

  function render() {
    stats.begin();

    //debugMesh.position.copy(pan.rigidBody.translation());
    //debugMesh.quaternion.copy(pan.rigidBody.rotation());

    // physics
    world.step();
    steak.position.copy(steak.rigidBody.translation());
    steak.quaternion.copy(steak.rigidBody.rotation());

    if (steak.position.y < -1) {
      const windowBonus = steak.position.z > 1;
      showResults(
        [...steak.cooked],
        steak.maxCooking,
        steak.canvases,
        windowBonus
      );
      steak.reset();
    }
    steak.update();
    const progress = steak.cookProgress;
    cookBarElement.style.width = `${progress * 100}%`;
    if (steak.burning) {
      particles.start(steak.position);
      cookBarElement.className = "burning";
      cookBarLabel.textContent = `BURNING!! ${Math.round(progress * 100)}%`;
    } else {
      particles.stop(steak.position);
      cookBarElement.className = "cooking";
      cookBarLabel.textContent = `${Math.round(progress * 100)}%`;
      if (progress >= 1) {
        cookBarElement.className = "";
      }
    }
    if (progress >= 1) {
      cookBarLabel.textContent += " - FLING IT OUT OF THE PAN!";
    }
    rainParticles.update();

    // move pan to target position and rotation
    pan.rigidBody.setLinvel(
      new RAPIER.Vector3(
        (pan.targetPosition.x - pan.position.x) * 10,
        (pan.targetPosition.y - pan.position.y) * 10,
        (pan.targetPosition.z - pan.position.z) * 10
      ),
      true
    );
    pan.rigidBody.setAngvel(
      new RAPIER.Vector3(
        (pan.targetRotation.x - pan.rotation.x) * 10,
        (pan.targetRotation.y - pan.rotation.y) * 10,
        (pan.targetRotation.z - pan.rotation.z) * 10
      ),
      true
    );

    pan.position.copy(pan.rigidBody.translation());
    pan.quaternion.copy(pan.rigidBody.rotation());

    const t = performance.now() / 1000;
    overheadLight.position.x = Math.sin(t * 2) / 16;
    overheadLight.rotation.z = Math.sin(t * 2) / 16;
    stoveLight.intensity = PerlinNoise.noise(t * 3, 0, 0) * 3 + 1;
    renderer.render(scene, camera);
    stats.end();
  }
  renderer.setAnimationLoop(render);
}
