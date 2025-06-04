import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";

// Contains various helper functions used in multiple places

export function meshToTrimesh(mesh) {
  const positionAttribute = mesh.geometry.getAttribute("position");

  // create indices array if not available
  let indices = mesh.geometry.index?.array;
  if (indices === undefined) {
    indices = new Uint32Array(positionAttribute.count);
    for (let i = 0; i < indices.length; i++) {
      indices[i] = i;
    }
  }

  return RAPIER.ColliderDesc.trimesh(positionAttribute.array, indices);
}
