import { Matrix4, Vector3 } from "./lib/cuon-matrix-cse160.js";
import generateMap from "./generateMap.js";

class Shape3D {
  constructor(options = {}) {
    this.type = "shape";
    this.vertexBuffer = null;
    this.position = options.position || [0, 0, 0];
    this.origin = options.origin || [0, 0, 0]; // Origin of the shape
    this.rotation = options.rotation || [0, 0, 0]; // in degrees
    this.scale = options.scale || [1, 1, 1]; // uniform scaling
    this.color = options.color || [1.0, 1.0, 1.0, 0.0]; // Default color is white
    this.vertices = new Float32Array(options.vertices || []);
    this.children = options.children || []; // Array of child shapes
    this.name = options.name || "shape"; // Name of the shape

    this.matrix = new Matrix4(); // Initialize the model matrix
    this.coordMatrix = new Matrix4(); // Initialize the coordinate matrix
    this.parent = null;
    this.transform();

    for (let child of this.children) {
      child.setParent(this); // Set parent for each child
    }

    // textures
    this.texture0 = options.texture0 || null; // Texture for the shape
  }

  _propagate() {
    for (let child of this.children) {
      child.transform(this.coordMatrix); // Propagate transformations to children
    }
  }

  setPosition(position) {
    this.position = position; // Set the position of the shape
    this.transform(this.parent?.coordMatrix);
    this._propagate(); // Propagate the transformation to children
  }

  setRotation(rotation) {
    this.rotation = rotation; // Set the rotation of the shape
    this.transform(this.parent?.coordMatrix);
    this._propagate(); // Propagate the transformation to children
  }

  setScale(scale) {
    this.scale = scale; // Set the scale of the shape
    this.transform(this.parent?.coordMatrix);
    this._propagate(); // Propagate the transformation to children
  }

  setParent(parent) {
    this.parent = parent; // Set the parent of the shape
    this.transform(parent?.coordMatrix); // Transform using parent's matrix
  }

  loadTexture(gl, url) {
    const texture = gl.createTexture();
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    };
    image.src = url;
    this.texture0 = texture; // Set the loaded texture
  }

  /**
   * Transform the shape using stored position/rotation/scale values.
   */
  transform(parentMatrix = null) {
    this.matrix.setIdentity(); // Reset the matrix to identity
    if (parentMatrix) {
      this.matrix.set(parentMatrix); // Apply parent transformations
    }
    // Important!! Order of transformations is bottom to top
    this.matrix.translate(this.origin[0], this.origin[1], this.origin[2]); // Translate back to position
    this.matrix.translate(this.position[0], this.position[1], this.position[2]);
    this.matrix.rotate(this.rotation[0], 1, 0, 0); // Rotate around x-axis
    this.matrix.rotate(this.rotation[1], 0, 1, 0); // Rotate around y-axis
    this.matrix.rotate(this.rotation[2], 0, 0, 1); // Rotate around z-axis
    this.coordMatrix = new Matrix4(this.matrix); // Store the non-rotated matrix
    this.matrix.scale(this.scale[0], this.scale[1], this.scale[2]); // Scale
    this.matrix.translate(-this.origin[0], -this.origin[1], -this.origin[2]); // Translate to origin

    for (let child of this.children) {
      child.transform(this.coordMatrix); // Transform children
    }
  }

  render(gl, variables, camera) {
    _render(this.vertices, gl, variables, camera); // Render the shape
  }

  _setupRendering(vertices, gl, variables, camera) {
    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
      }
    }
    // Set up buffers and positioning
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(variables.a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(variables.a_Position);

    gl.vertexAttribPointer(variables.a_Uv, 2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(variables.a_Uv);

    // color
    gl.uniform4f(
      variables.u_BaseColor,
      this.color[0],
      this.color[1],
      this.color[2],
      1.0
    );

    gl.uniform1f(variables.u_TexColorWeight, 1 - this.color[3]);

    // Model matrix transformation
    gl.uniformMatrix4fv(variables.u_ModelMatrix, false, this.matrix.elements);
    gl.uniformMatrix4fv(
      variables.u_ViewMatrix,
      false,
      camera.viewMatrix.elements
    );
    gl.uniformMatrix4fv(
      variables.u_ProjectionMatrix,
      false,
      camera.projectionMatrix.elements
    );
  }

  _render(vertices, gl, variables, camera) {
    this._setupRendering(vertices, gl, variables, camera); // Set up rendering

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 5);

    if (this.children) {
      for (let child of this.children) {
        child.render(gl, variables, camera); // Render children
      }
    }
  }
}

const cube_verts = [
  //FRONT
  -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5,
  0.5, 0.5, 0.5, 0.5,
  //LEFT
  -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
  -0.5, 0.5, -0.5, 0.5, 0.5,
  //RIGHT
  0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, -0.5,
  //TOP
  -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
  0.5, 0.5, 0.5, -0.5,
  //BACK
  0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5, -0.5,
  //BOTTOM
  -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5,
  -0.5, -0.5, 0.5, -0.5, 0.5,
];
const cube_uvs = [
  // front
  1, 0.5, 1, 0.75, 0.75, 0.75, 1, 0.5, 0.75, 0.75, 0.75, 0.5,
  // left
  0.75, 0.5, 0.75, 0.75, 0.5, 0.75, 0.75, 0.5, 0.5, 0.75, 0.5, 0.5,
  // right
  0.5, 0.5, 0.5, 0.75, 0.25, 0.75, 0.5, 0.5, 0.25, 0.75, 0.25, 0.5,
  // top
  0.5, 0.25, 0.5, 0.5, 0.25, 0.5, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25,
  // back
  0.25, 0.5, 0.25, 0.75, 0, 0.5, 0, 0.5, 0.25, 0.75, 0, 0.75,
  // bottom
  0.5, 0.75, 0.5, 1, 0.25, 1, 0.5, 0.75, 0.25, 1, 0.25, 0.75,
];

// Cube vertices
function getCubeVertices() {
  const vertices = [];
  for (let i = 0; i < cube_verts.length / 3; i++) {
    vertices.push(
      cube_verts[i * 3],
      cube_verts[i * 3 + 1],
      cube_verts[i * 3 + 2],
      cube_uvs[i * 2],
      cube_uvs[i * 2 + 1]
    );
  }
  return vertices;
}

const BLOCK_TABLE = {
  stone: { uvs: [{ x: 1, y: 0, side: "all" }] },
  dirt: { uvs: [{ x: 2, y: 0, side: "all" }], mineDuration: 500 },
  grass: {
    uvs: [
      { x: 3, y: 0, side: "all" },
      { x: 0, y: 0, side: "top" },
      { x: 2, y: 0, side: "bottom" },
    ],
    mineDuration: 750,
  },
  wooden_planks: { uvs: [{ x: 4, y: 0, side: "all" }] },
  stone_slab: {
    uvs: [
      { x: 5, y: 0, side: "all" },
      { x: 6, y: 0, side: "top" },
      { x: 6, y: 0, side: "bottom" },
    ],
  },
  brick: { uvs: [{ x: 7, y: 0, side: "all" }] },
  tnt: {
    uvs: [
      { x: 8, y: 0, side: "all" },
      { x: 9, y: 0, side: "top" },
      { x: 10, y: 0, side: "bottom" },
    ],
  },
  cobblestone: { uvs: [{ x: 0, y: 1, side: "all" }] },
  bedrock: { uvs: [{ x: 1, y: 1, side: "all" }] },
  sand: { uvs: [{ x: 2, y: 1, side: "all" }] },
  gravel: { uvs: [{ x: 3, y: 1, side: "all" }] },
  wood: {
    uvs: [
      { x: 4, y: 1, side: "all" },
      { x: 5, y: 1, side: "top" },
      { x: 5, y: 1, side: "bottom" },
    ],
  },
  leaves: {
    uvs: [{ x: 5, y: 3, side: "all" }],
  },
  coal_ore: {
    uvs: [{ x: 2, y: 2, side: "all" }],
    score: 100,
    mineDuration: 2000,
  },
  iron_ore: {
    uvs: [{ x: 1, y: 2, side: "all" }],
    score: 300,
    mineDuration: 3000,
  },
  gold_ore: {
    uvs: [{ x: 0, y: 2, side: "all" }],
    score: 900,
    mineDuration: 4000,
  },
  redstone_ore: {
    uvs: [{ x: 3, y: 3, side: "all" }],
    score: 1200,
    mineDuration: 5000,
  },
  diamond_ore: {
    uvs: [{ x: 2, y: 3, side: "all" }],
    score: 2000,
    mineDuration: 6000,
  },
  // Breaking textures
  breaking_0: { uvs: [{ x: 0, y: 15, side: "all" }] },
  breaking_1: { uvs: [{ x: 1, y: 15, side: "all" }] },
  breaking_2: { uvs: [{ x: 2, y: 15, side: "all" }] },
  breaking_3: { uvs: [{ x: 3, y: 15, side: "all" }] },
  breaking_4: { uvs: [{ x: 4, y: 15, side: "all" }] },
  breaking_5: { uvs: [{ x: 5, y: 15, side: "all" }] },
  breaking_6: { uvs: [{ x: 6, y: 15, side: "all" }] },
  breaking_7: { uvs: [{ x: 7, y: 15, side: "all" }] },
  breaking_8: { uvs: [{ x: 8, y: 15, side: "all" }] },
  breaking_9: { uvs: [{ x: 9, y: 15, side: "all" }] },
  selection: { uvs: [{ x: 6, y: 2, side: "all" }] },
};

let globalTerrain = null;
const terrainSize = 512; // Size of the terrain texture
const textureSize = 16; // Size of each texture tile
class Block extends Shape3D {
  constructor(handler, options) {
    super({
      ...options,
      vertices: getCubeVertices(),
    });
    this.type = "cube";

    if (!options.color || options.color[3] < 1) {
      if (options.name) {
        this.setupUVs(BLOCK_TABLE[options.name].uvs);
      } else {
        this.setupUVs(BLOCK_TABLE.dirt.uvs);
      }
      if (BLOCK_TABLE[options.name]?.color) {
        this.color = BLOCK_TABLE[options.name].color;
      }
    }
    this.mineDuration = BLOCK_TABLE[options.name]?.mineDuration || 1000;
    this.score = BLOCK_TABLE[options.name]?.score || 1;
    this.handler = handler;
  }

  loadTerrainTexture(gl) {
    if (globalTerrain) {
      this.texture0 = globalTerrain;
      return;
    }
    const texture = gl.createTexture();
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      globalTerrain = texture;
    };
    image.src = "textures/terrain.png";
  }

  setUV(left, right, top, bottom, start = 0) {
    // x: max max min max min min
    // y: min max max min max min
    let newUVs = [
      right,
      top,
      right,
      bottom,
      left,
      bottom,
      right,
      top,
      left,
      bottom,
      left,
      top,
    ];
    if (start === 24) {
      // back side is UV mapped differently
      // x: max max min min max min
      // y: min max min min max max
      newUVs = [
        right,
        top,
        right,
        bottom,
        left,
        top,
        left,
        top,
        right,
        bottom,
        left,
        bottom,
      ];
    }
    for (let i = start; i < start + 6; i++) {
      this.vertices[i * 5 + 3] = newUVs[(i - start) * 2];
      this.vertices[i * 5 + 4] = newUVs[(i - start) * 2 + 1];
    }
  }

  setupUVs(uvs) {
    for (const uv of uvs) {
      const left = ((uv.x * textureSize) / terrainSize) * 2 - 1;
      const right = (((uv.x + 1) * textureSize) / terrainSize) * 2 - 1;
      const top = ((uv.y * textureSize) / terrainSize) * 2 - 1;
      const bottom = (((uv.y + 1) * textureSize) / terrainSize) * 2 - 1;
      const side = uv.side || "all";
      switch (side) {
        case "all":
          this.setUV(left, right, top, bottom, 0);
          this.setUV(left, right, top, bottom, 6);
          this.setUV(left, right, top, bottom, 12);
          this.setUV(left, right, top, bottom, 18);
          this.setUV(left, right, top, bottom, 24);
          this.setUV(left, right, top, bottom, 30);
          break;
        case "front":
          this.setUV(left, right, top, bottom, 0);
          break;
        case "back":
          this.setUV(left, right, top, bottom, 24);
          break;
        case "left":
          this.setUV(left, right, top, bottom, 6);
          break;
        case "right":
          this.setUV(left, right, top, bottom, 12);
          break;
        case "top":
          this.setUV(left, right, top, bottom, 18);
          break;
        case "bottom":
          this.setUV(left, right, top, bottom, 30);
          break;
        default:
          console.error("Invalid side specified for UV mapping");
          break;
      }
    }
  }

  render(gl, variables, camera) {
    this._render(this.vertices, gl, variables, camera); // Render the cube
  }
}

class BlockHandler {
  constructor(gl, variables, camera) {
    this.gl = gl;
    this.variables = variables;
    this.camera = camera;
    this.blocks = new Map();
    this.setupSky();
    this.loadTerrainTexture();

    // compiled blocks
    this.compiled = false;
    this.compiledY = 0;
    this.compiledObject = new Shape3D();

    // mining breaking preview
    this.mining = false;
    this.miningBlock = null;
    this.miningStart = 0;
    this.miningSpeed = 1;
    this.miningRadius = 0;
    this.miningPreview = new Block(this, {
      name: "breaking_0",
      position: [0, 0, 0],
    });
    this.miningPreview.setScale([1.002, 1.002, 1.002]); // Scale the preview slightly larger

    // selection preview
    this.selectionPreview = new Block(this, {
      name: "selection",
      position: [0, 0, 0],
    });
    this.selectionPreview.setScale([1.001, 1.001, 1.001]); // Scale the preview slightly larger
    this.selected = false;

    this.chunkSize = 32;
    this.generateDepth = 0;
    this.score = 0;
    this.compileBlocks();
  }

  setupSky() {
    this.sky = new Block(this, {
      name: "sky",
      position: [0, 0, 0],
      scale: [100, 100, 100],
      color: [0.5, 0.5, 1, 1],
    });
    // invert the cube vertices
    for (let i = 0; i < this.sky.vertices.length / 5; i++) {
      this.sky.vertices[i * 5] *= -1;
      this.sky.vertices[i * 5 + 1] *= -1;
      this.sky.vertices[i * 5 + 2] *= -1;
    }
  }

  addBlock(name, position) {
    this.blocks.set(position.join(","), new Block(this, { name, position }));
    this.compiled = false;
  }

  removeBlock(position) {
    this.blocks.delete(position.join(","));
    this.compiled = false;
  }

  raycast(p, rotation, returnSurface = false, maxSteps = 50) {
    // Raycasting algorithm to find the first block hit by the ray
    const s = new Vector3().set(rotation).normalize().mul(0.1);
    const position = new Vector3().set(p);
    position.elements[1] += 1;
    for (let i = 0; i < maxSteps; i++) {
      const rounded = position.elements.map(Math.round);
      const newBlock = this.getBlockAt(...rounded);
      if (newBlock) {
        // place it at lastBlock position
        if (newBlock.name !== "bedrock" && newBlock.name !== "wall") {
          this.selected = true;
          this.selectionPreview.setPosition(newBlock.position);

          if (this.mining && this.miningBlock?.position !== newBlock.position) {
            this.startMining(newBlock.position);
          }

          if (returnSurface) {
            const blockPosition = [...newBlock.position];
            const diff = newBlock.position.map(
              (v, i) => v - position.elements[i]
            );
            const maxIndex = diff.indexOf(Math.max(...diff));
            const minIndex = diff.indexOf(Math.min(...diff));
            if (Math.abs(diff[maxIndex]) > Math.abs(diff[minIndex])) {
              // Max larger - move up/right
              blockPosition[maxIndex] -= 1; // Move the block position up
            } else {
              // Min larger - move down/left
              blockPosition[minIndex] += 1; // Move the block position down
            }

            return blockPosition;
          }
          return newBlock; // Return the first block hit
        }
        break;
      }
      position.add(s);
    }
    this.selected = false;
  }

  startMining(position) {
    const block = this.getBlockAt(...position);
    this.mining = true;
    this.miningBlock = block;
    this.miningStart = performance.now();
    this.miningPreview.setPosition(block.position);
    this.miningPreview.setupUVs(BLOCK_TABLE[`breaking_0`].uvs);
  }

  stopMining() {
    this.mining = false;
    this.miningBlock = null;
    this.miningPreview.setPosition([0, 0, 0]);
    this.miningPreview.setupUVs(BLOCK_TABLE[`breaking_0`].uvs);
  }

  getBlockAt(x, y, z) {
    if (x > 16 || x < -16 || z > 16 || z < -16) {
      return { name: "wall", position: [x, y, z], vertices: [] }; // Out of bounds
    }
    return this.blocks.get(
      `${Math.round(x)},${Math.round(y)},${Math.round(z)}`
    );
  }

  isBlockVisible(x, y, z) {
    const neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ];
    for (const neighbor of neighbors) {
      if (!this.getBlockAt(...neighbor)) {
        return true; // At least one neighbor is empty
      }
    }
    return false; // All neighbors are filled
  }

  loadTerrainTexture() {
    if (globalTerrain) {
      this.texture0 = globalTerrain;
      return;
    }
    const texture = this.gl.createTexture();
    const image = new Image();
    image.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        image
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.NEAREST
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR
      );
      globalTerrain = texture;
    };
    image.src = "textures/terrain.png";
  }

  deleteBlocksAbove(y) {
    console.log("Deleting blocks above Y:", y);
    for (const [key, block] of this.blocks) {
      if (block.position[1] > y) {
        this.blocks.delete(key);
      }
    }
  }

  compileBlocks(compiledY = 0) {
    const vertices = [];
    console.log("Compiling blocks for chunk Y:", compiledY);

    if (this.generateDepth + this.chunkSize > compiledY * this.chunkSize) {
      console.log("Generating new chunk");
      generateMap(this, -this.generateDepth, 16, this.chunkSize / 2);
      this.generateDepth -= this.chunkSize;
      this.deleteBlocksAbove(this.generateDepth + 64);

      if (compiledY === 0) {
        // new render - snap to y
        const diffY = this.camera.position.elements[1] - 3;
        this.camera.moveUp(diffY);
        this.camera.velocity.elements[1] = 0;
      }
    }

    for (let block of this.blocks.values()) {
      if (
        Math.abs(compiledY - Math.round(block.position[1] / this.chunkSize)) > 3
      ) {
        continue;
      }
      // for each side, check if the block is visible
      const [x, y, z] = block.position;
      const neighbors = [
        [x, y, z + 1],
        [x - 1, y, z],
        [x + 1, y, z],
        [x, y + 1, z],
        [x, y, z - 1],
        [x, y - 1, z],
      ];
      for (let i = 0; i < neighbors.length; i++) {
        if (!this.getBlockAt(...neighbors[i])) {
          let selection = block.vertices.slice(i * 5 * 6, (i + 1) * 5 * 6);
          vertices.push(
            ...selection.map((v, i) => {
              if (i % 5 < 3) {
                return v + block.position[i % 5];
              } else {
                return v;
              }
            })
          );
        }
      }
    }
    this.compiledObject.vertices = new Float32Array(vertices);
    this.compiled = true;
    this.compiledY = compiledY;
  }

  render(gl, camera) {
    const isAboveGround = camera.position.elements[1] > -10;
    if (isAboveGround) {
      this.sky.render(this.gl, this.variables, camera); // Render the sky
    }
    const chunkY = Math.round(camera.position.elements[1] / this.chunkSize);
    if (Math.round(this.compiledY) !== chunkY || !this.compiled) {
      // recompile for new chunk
      this.compileBlocks(chunkY);
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.compiledObject._render(
      this.compiledObject.vertices,
      this.gl,
      this.variables,
      camera
    ); // Render the compiled object

    if (this.miningBlock) {
      gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
      // set preview
      const miningState = Math.floor(
        ((performance.now() - this.miningStart) /
          (this.miningBlock.mineDuration / this.miningSpeed)) *
          10
      );
      if (miningState > 9) {
        // done mining
        this.miningPreview.setPosition([0, 0, 0]);
        this.miningPreview.setupUVs(BLOCK_TABLE[`breaking_0`].uvs);
        this.removeBlock(this.miningBlock.position);
        this.score += this.miningBlock.score;

        if (this.miningRadius > 0) {
          // secret mining radius
          for (let i = -this.miningRadius; i <= this.miningRadius; i++) {
            for (let j = -this.miningRadius; j <= this.miningRadius; j++) {
              for (let k = -this.miningRadius; k <= this.miningRadius; k++) {
                const block = this.getBlockAt(
                  this.miningBlock.position[0] + i,
                  this.miningBlock.position[1] + j,
                  this.miningBlock.position[2] + k
                );
                if (block) {
                  this.removeBlock(block.position);
                  this.score += block.score;
                }
              }
            }
          }
        }
        // raycast to new block
        this.miningBlock = null;
        const newBlock = this.raycast(
          this.camera.position,
          this.camera.rotation
        );
        if (newBlock) {
          this.startMining(newBlock.position);
        }
      } else {
        this.miningPreview.setupUVs(BLOCK_TABLE[`breaking_${miningState}`].uvs);
        this.miningPreview.render(this.gl, this.variables, camera); // Render the mining preview
      }
    }
    if (this.selected) {
      gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
      this.selectionPreview.render(this.gl, this.variables, camera); // Render the selection preview
    }
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}

export { Shape3D, Block, BlockHandler };
