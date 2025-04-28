import { Matrix4 } from "./lib/cuon-matrix-cse160.js";

function createControls3D(onchange, min, max, values) {
  const container = document.createElement("div");
  const sliderX = document.createElement("input");
  const sliderY = document.createElement("input");
  const sliderZ = document.createElement("input");

  sliderX.type = "range";
  sliderY.type = "range";
  sliderZ.type = "range";
  sliderX.min = min;
  sliderY.min = min;
  sliderZ.min = min;
  sliderX.max = max;
  sliderY.max = max;
  sliderZ.max = max;
  sliderX.value = values[0];
  sliderY.value = values[1];
  sliderZ.value = values[2];

  sliderX.step = 0.1;
  sliderY.step = 0.1;
  sliderZ.step = 0.1;

  sliderX.addEventListener("input", (e) => {
    values[0] = parseFloat(e.target.value);
    onchange(values);
  });
  sliderY.addEventListener("input", (e) => {
    values[1] = parseFloat(e.target.value);
    onchange(values);
  });
  sliderZ.addEventListener("input", (e) => {
    values[2] = parseFloat(e.target.value);
    onchange(values);
  });
  container.appendChild(sliderX);
  container.appendChild(sliderY);
  container.appendChild(sliderZ);
  return container;
}

class Shape3D {
  constructor(options) {
    this.type = "shape";
    this.vertexBuffer = null;
    this.position = options.position || [0, 0, 0];
    this.origin = options.origin || [0, 0, 0]; // Origin of the shape
    this.rotation = options.rotation || [0, 0, 0]; // in degrees
    this.scale = options.scale || [1, 1, 1]; // uniform scaling
    this.color = options.color || [1.0, 1.0, 1.0, 1.0]; // Default color is white
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

  /**
   * Adds controls to the shape.
   */
  addControls() {
    // Add controls for position, rotation, and scale
    const container = document.createElement("div");
    const title = document.createElement("h3");
    title.innerText = this.name;
    container.appendChild(title);

    container.appendChild(
      createControls3D(
        (values) => {
          this.setPosition(values);
        },
        -2,
        2,
        this.position
      )
    );
    container.appendChild(
      createControls3D(
        (values) => {
          this.setRotation(values);
        },
        -180,
        180,
        this.rotation
      )
    );
    container.appendChild(
      createControls3D(
        (values) => {
          this.setScale(values);
        },
        0.1,
        3,
        this.scale
      )
    );
    document.body.appendChild(container); // Append controls to the body
  }

  render(gl, variables, globalRotateMatrix) {
    _render(this.vertices, gl, variables, globalRotateMatrix); // Render the shape
  }

  _setupRendering(vertices, gl, variables, globalRotateMatrix) {
    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
      }
    }
    // Set up buffers and positioning
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(variables.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(variables.a_Position);

    // Model matrix transformation
    gl.uniformMatrix4fv(variables.u_ModelMatrix, false, this.matrix.elements);
    gl.uniformMatrix4fv(
      variables.u_GlobalRotateMatrix,
      false,
      globalRotateMatrix.elements
    );

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(
      variables.u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
  }

  _render(vertices, gl, variables, globalRotateMatrix) {
    this._setupRendering(vertices, gl, variables, globalRotateMatrix); // Set up rendering

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);

    if (this.children) {
      for (let child of this.children) {
        child.render(gl, variables, globalRotateMatrix); // Render children
      }
    }
  }
}

// Cube vertices
function getCubeVertices() {
  const verts = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

    // Back face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

    // Top face
    -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,

    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,

    // Left face
    -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
  ];
  const indices = [
    8,
    9,
    10,
    8,
    10,
    11, // top
    0,
    1,
    2,
    0,
    2,
    3, // front
    20,
    21,
    22,
    20,
    22,
    23, // left
    16,
    17,
    18,
    16,
    18,
    19, // right
    4,
    5,
    6,
    4,
    6,
    7, // back
    12,
    13,
    14,
    12,
    14,
    15, // bottom
  ];

  const vertices = indices.map((x) => verts.slice(x * 3, (x + 1) * 3)).flat();
  return vertices;
}

class Cube extends Shape3D {
  constructor(options) {
    super({
      vertices: getCubeVertices(),
      ...options,
    });
    this.type = "cube";
  }

  render(gl, variables, globalRotateMatrix) {
    let color = [...this.color];
    for (let i = 0; i < this.vertices.length; i += 18) {
      let currentFace = this.vertices.slice(i, i + 18);
      this._setupRendering(currentFace, gl, variables, globalRotateMatrix); // Set up rendering
      gl.drawArrays(gl.TRIANGLES, 0, currentFace.length);
      // Set color for each face
      this.color = [
        this.color[0] - 0.1,
        this.color[1] - 0.1,
        this.color[2] - 0.1,
        this.color[3],
      ];
    }
    this.color = color; // Reset color after rendering

    for (let child of this.children) {
      child.render(gl, variables, globalRotateMatrix); // Render children
    }
  }
}

function getConeVertices() {
  const vertices = [];
  const numSegments = 20; // Number of segments for the cone base
  const radius = 0.5; // Radius of the cone base
  const height = 1.0; // Height of the cone

  // Base vertices
  for (let i = 0; i <= numSegments; i++) {
    const angle = (i * Math.PI * 2) / numSegments;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    vertices.push(x, -height, z); // Base vertex
    vertices.push(0, height, 0); // Apex vertex
    vertices.push(
      vertices[vertices.length - 3],
      -height,
      vertices[vertices.length - 1]
    ); // Base vertex
  }

  return vertices;
}

class Cone extends Shape3D {
  constructor(options) {
    super({
      vertices: getConeVertices(),
      ...options,
    });
    this.type = "cone";
  }

  render(gl, variables, globalRotateMatrix) {
    this._setupRendering(this.vertices, gl, variables, globalRotateMatrix); // Set up rendering

    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertices.length / 3); // Draw the cone

    if (this.children) {
      for (let child of this.children) {
        child.render(gl, variables, globalRotateMatrix); // Render children
      }
    }
  }
}

export { Shape3D, Cube, Cone };
