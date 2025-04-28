import { Cube, Cone } from "./shapes.js";
import { Matrix4 } from "./lib/cuon-matrix-cse160.js";

function setupWebGL(canvas) {
  const gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
    alpha: true,
  });
  if (!gl) {
    console.error("Failed to get the rendering context for WebGL");
    return null;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, 800, 800);
  return gl;
}

let VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
}
`;

let FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

function createShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    console.error("Failed to compile shader: " + gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

// Compile and initialize shaders, then attach them to the program and link it to gl
function initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE) {
  const vshader = createShader(gl, gl.VERTEX_SHADER, VSHADER_SOURCE);
  const fshader = createShader(gl, gl.FRAGMENT_SHADER, FSHADER_SOURCE);
  if (!vshader || !fshader) {
    console.error("Failed to create shaders.");
    return false;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);

  const program_linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!program_linked) {
    console.error("Failed to link program: " + gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);
  gl.program = program;

  return true;
}

function connectVariablesToGLSL(gl) {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error("Failed to initialize shaders.");
    return false;
  }

  // Get storage locations of attribute and uniform variables
  const a_Position = gl.getAttribLocation(gl.program, "a_Position");
  const u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  const u_PointSize = gl.getUniformLocation(gl.program, "u_PointSize");
  const u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  const u_GlobalRotateMatrix = gl.getUniformLocation(
    gl.program,
    "u_GlobalRotateMatrix"
  );

  return {
    a_Position,
    u_FragColor,
    u_PointSize,
    u_ModelMatrix,
    u_GlobalRotateMatrix,
  };
}

let shapes = [
  new Cube({
    name: "root",
    origin: [0, 0, 0],
    position: [0, -0.2, 0],
    rotation: [0, 0, 0],
    scale: [0.25, 0.3, 0.25],
    color: [1, 0, 0, 1], // Red
    children: [
      new Cube({
        name: "neck",
        scale: [0.2, 0.25, 0.2],
        position: [0, 0.35, 0],
        origin: [0, -0.2, 0],
        rotation: [0, 0, 0],
        color: [0.9, 0, 0, 1],
        children: [
          new Cube({
            name: "head",
            scale: [0.35, 0.4, 0.35],
            position: [0, 0.45, 0],
            origin: [0, -0.3, 0],
            rotation: [0, 0, 0],
            color: [1, 0, 0, 1],
            children: [
              new Cone({
                name: "nose",
                origin: [0, 0, 0],
                position: [0, 0.1, -0.2],
                rotation: [-90, 0, 0],
                scale: [0.1, 0.1, 0.1],
                color: [1, 0, 0, 1],
              }),
              new Cone({
                name: "leaf-stem",
                origin: [0, -1, 0],
                position: [0, 1.2, 0],
                rotation: [0, 0, 0],
                scale: [0.1, 0.3, 0.1],
                color: [0, 0.6, 0, 1],
                children: [
                  new Cube({
                    name: "leaf",
                    origin: [0, 0, 0],
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    scale: [0.2, 0.2, 0.2],
                    color: [1, 1, 0.6, 1],
                  }),
                ],
              }),
              new Cube({
                name: "left-eye",
                scale: [0.1, 0.05, 0.05],
                position: [-0.15, 0.2, -0.2],
                rotation: [0, 0, 0],
                color: [1, 1, 1, 1],
                children: [
                  new Cube({
                    name: "left-eye-pupil",
                    scale: [0.05, 0.04, 0.05],
                    position: [0, 0, -0.005],
                    rotation: [0, 0, 0],
                    color: [0, 0, 0, 1],
                  }),
                ],
              }),
              new Cube({
                name: "right-eye",
                scale: [0.1, 0.05, 0.05],
                position: [0.15, 0.2, -0.2],
                rotation: [0, 0, 0],
                color: [1, 1, 1, 1],
                children: [
                  new Cube({
                    name: "right-eye-pupil",
                    scale: [0.05, 0.04, 0.05],
                    position: [0, 0, -0.005],
                    rotation: [0, 0, 0],
                    color: [0, 0, 0, 1],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Cube({
        name: "left-arm",
        scale: [0.05, 0.2, 0.05],
        position: [-0.1, -0.15, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, -35],
        color: [0.8, 0, 0, 1],
        children: [
          new Cube({
            name: "left-hand",
            scale: [0.07, 0.07, 0.07],
            position: [-0.0, -0.45, 0],
            origin: [0, 0.3, 0],
            rotation: [0, 0, 0],
            color: [0.9, 0, 0, 1],
          }),
        ],
      }),
      new Cube({
        name: "right-arm",
        scale: [0.05, 0.2, 0.05],
        position: [0.1, -0.15, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 35],
        color: [0.8, 0, 0, 1],
        children: [
          new Cube({
            name: "right-hand",
            scale: [0.07, 0.07, 0.07],
            position: [0.0, -0.45, 0],
            origin: [0, 0.3, 0],
            rotation: [0, 0, 0],
            color: [0.9, 0, 0, 1],
          }),
        ],
      }),
      new Cube({
        name: "left-leg",
        scale: [0.05, 0.2, 0.05],
        position: [-0.07, -0.4, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 0],
        color: [0.7, 0, 0, 1],
      }),
      new Cube({
        name: "right-leg",
        scale: [0.05, 0.2, 0.05],
        position: [0.07, -0.4, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 0],
        color: [0.7, 0, 0, 1],
      }),
    ],
  }),
];

function getShape(name, ctx = shapes) {
  for (let shape of ctx) {
    if (shape.name === name) return shape;
    if (shape.children) {
      const childShape = getShape(name, shape.children);
      if (childShape) return childShape; // Return the found shape
    }
  }
  return null;
}

let globalRotateMatrix = new Matrix4(); // Global rotation matrix
function renderScene(gl, variables) {
  const perf = performance.now(); // Start performance measurement
  // clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  for (let shape of shapes) {
    shape.render(gl, variables, globalRotateMatrix);
  }

  const perfEnd = performance.now(); // End performance measurement
  const perfTime = perfEnd - perf; // Calculate performance time
  const renderTime = document.getElementById("render-time");
  renderTime.innerText = perfTime.toFixed(2);
}

function giveFriends() {
  // HACK: I would've made a cloning function, but it kept breaking...
  const root = getShape("root");
  const newPikmin = new Cube({
    name: "root",
    origin: [0, 0, 0],
    position: [0, -0.2, 0],
    rotation: [0, 0, 0],
    scale: [0.25, 0.3, 0.25],
    color: [1, 0, 0, 1], // Red
    children: [
      new Cube({
        name: "neck",
        scale: [0.2, 0.25, 0.2],
        position: [0, 0.35, 0],
        origin: [0, -0.2, 0],
        rotation: [0, 0, 0],
        color: [0.9, 0, 0, 1],
        children: [
          new Cube({
            name: "head",
            scale: [0.35, 0.4, 0.35],
            position: [0, 0.45, 0],
            origin: [0, -0.3, 0],
            rotation: [0, 0, 0],
            color: [1, 0, 0, 1],
            children: [
              new Cone({
                name: "nose",
                origin: [0, 0, 0],
                position: [0, 0.1, -0.2],
                rotation: [-90, 0, 0],
                scale: [0.1, 0.1, 0.1],
                color: [1, 0, 0, 1],
              }),
              new Cone({
                name: "leaf-stem",
                origin: [0, -1, 0],
                position: [0, 1.2, 0],
                rotation: [0, 0, 0],
                scale: [0.1, 0.3, 0.1],
                color: [0, 0.6, 0, 1],
                children: [
                  new Cube({
                    name: "leaf",
                    origin: [0, 0, 0],
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    scale: [0.2, 0.2, 0.2],
                    color: [1, 1, 0.6, 1],
                  }),
                ],
              }),
              new Cube({
                name: "left-eye",
                scale: [0.1, 0.05, 0.05],
                position: [-0.15, 0.2, -0.2],
                rotation: [0, 0, 0],
                color: [1, 1, 1, 1],
                children: [
                  new Cube({
                    name: "left-eye-pupil",
                    scale: [0.05, 0.04, 0.05],
                    position: [0, 0, -0.005],
                    rotation: [0, 0, 0],
                    color: [0, 0, 0, 1],
                  }),
                ],
              }),
              new Cube({
                name: "right-eye",
                scale: [0.1, 0.05, 0.05],
                position: [0.15, 0.2, -0.2],
                rotation: [0, 0, 0],
                color: [1, 1, 1, 1],
                children: [
                  new Cube({
                    name: "right-eye-pupil",
                    scale: [0.05, 0.04, 0.05],
                    position: [0, 0, -0.005],
                    rotation: [0, 0, 0],
                    color: [0, 0, 0, 1],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Cube({
        name: "left-arm",
        scale: [0.05, 0.2, 0.05],
        position: [-0.1, -0.15, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, -35],
        color: [0.8, 0, 0, 1],
        children: [
          new Cube({
            name: "left-hand",
            scale: [0.07, 0.07, 0.07],
            position: [-0.0, -0.45, 0],
            origin: [0, 0.3, 0],
            rotation: [0, 0, 0],
            color: [0.9, 0, 0, 1],
          }),
        ],
      }),
      new Cube({
        name: "right-arm",
        scale: [0.05, 0.2, 0.05],
        position: [0.1, -0.15, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 35],
        color: [0.8, 0, 0, 1],
        children: [
          new Cube({
            name: "right-hand",
            scale: [0.07, 0.07, 0.07],
            position: [0.0, -0.45, 0],
            origin: [0, 0.3, 0],
            rotation: [0, 0, 0],
            color: [0.9, 0, 0, 1],
          }),
        ],
      }),
      new Cube({
        name: "left-leg",
        scale: [0.05, 0.2, 0.05],
        position: [-0.07, -0.4, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 0],
        color: [0.7, 0, 0, 1],
      }),
      new Cube({
        name: "right-leg",
        scale: [0.05, 0.2, 0.05],
        position: [0.07, -0.4, 0],
        origin: [0, 0.3, 0],
        rotation: [0, 0, 0],
        color: [0.7, 0, 0, 1],
      }),
    ],
  });
  newPikmin.name = "friend" + shapes.length;
  newPikmin.setPosition([
    Math.random() * shapes.length - shapes.length / 2,
    -0.2,
    Math.random() * shapes.length - shapes.length / 2,
  ]); // Random position
  shapes.push(newPikmin);
  globalScale = 1 / (shapes.length / 2);
  setGlobalRotation(...globalRotation);
}

function animate(time, root) {
  // update animations
  if (currentAnimation === "walk") {
    let upperRotation = Math.sin(time * 15) * 5 - 2;
    root.setPosition([
      root.position[0],
      -0.2 + Math.sin(time * 15) * 0.03,
      root.position[2],
    ]);
    getShape("left-leg", root.children).setRotation([
      Math.sin(time * 10) * 60 - 7,
      0,
      0,
    ]);
    getShape("right-leg", root.children).setRotation([
      Math.sin(time * 10 + 3) * 60 - 7,
      0,
      0,
    ]);
    getShape("left-arm", root.children).setRotation([
      Math.sin(time * 10) * 80,
      0,
      -35,
    ]);
    getShape("right-arm", root.children).setRotation([
      Math.sin(time * 10 + 3) * 80,
      0,
      35,
    ]);
    getShape("neck", root.children).setRotation([
      -upperRotation + neckRotation,
      0,
      0,
    ]);
    getShape("head", root.children).setRotation([-upperRotation, 0, 0]);
    getShape("leaf-stem", root.children).setRotation([
      Math.sin(time * 15 + 3) * 20 + leafStemRotation,
      0,
      0,
    ]);
    getShape("leaf", root.children).setRotation([
      Math.sin(time * 15 + 3) * 20 + leafStemRotation,
      0,
      0,
    ]);
    getShape("left-eye-pupil", root.children).setScale([0.05, 0.04, 0.05]);
    getShape("right-eye-pupil", root.children).setScale([0.05, 0.04, 0.05]);
  } else if (currentAnimation === "poke") {
    // Poke animation - 500 ms
    let upperRotation = Math.sin(time * 6 + 3.14) * -25;
    getShape("left-arm", root.children).setRotation([
      upperRotation,
      0,
      -upperRotation * 5,
    ]);
    getShape("right-arm", root.children).setRotation([
      upperRotation,
      0,
      upperRotation * 5,
    ]);
    getShape("left-leg", root.children).setRotation([0, 0, 0]);
    getShape("right-leg", root.children).setRotation([0, 0, 0]);
    getShape("neck", root.children).setRotation([upperRotation, 0, 0]);
    getShape("head", root.children).setRotation([upperRotation, 0, 0]);
    getShape("left-eye-pupil", root.children).setScale([0.02, 0.01, 0.05]);
    getShape("right-eye-pupil", root.children).setScale([0.02, 0.01, 0.05]);
  } else if (currentAnimation === "idle") {
    // Idle animation - 500 ms
    getShape("left-arm", root.children).setRotation([0, 0, -35]);
    getShape("right-arm", root.children).setRotation([0, 0, 35]);
    getShape("left-leg", root.children).setRotation([0, 0, 0]);
    getShape("right-leg", root.children).setRotation([0, 0, 0]);
    getShape("neck", root.children).setRotation([neckRotation, 0, 0]);
    getShape("head", root.children).setRotation([0, 0, 0]);
    getShape("left-eye-pupil", root.children).setScale([0.05, 0.04, 0.05]);
    getShape("right-eye-pupil", root.children).setScale([0.05, 0.04, 0.05]);
    getShape("leaf-stem", root.children).setRotation([leafStemRotation, 0, 0]);
  }
}

let time = 0;
let lastTime = performance.now(); // Initialize lastTime
let currentAnimation = "walk";
function tick(gl, variables) {
  let newTime = performance.now();
  time += (newTime - lastTime) / 1000; // Update time
  lastTime = newTime; // Update lastTime

  for (let shape of shapes) {
    animate(time, shape);
  }

  renderScene(gl, variables); // Render the scene
  requestAnimationFrame(tick.bind(null, gl, variables)); // Request animation frame
}

let pokeTimeout = null;
function poke() {
  clearTimeout(pokeTimeout); // Clear any existing timeout
  time = 0;
  currentAnimation = "poke";
  pokeTimeout = setTimeout(() => {
    if (walkingEnabled) {
      currentAnimation = "walk";
    } else {
      currentAnimation = "idle";
    }
  }, 500);
}

let dragging = false;
let startPos = [0, 0];
let startRotation = [0, 0, 0];
function click(gl, variables, ev) {
  if (ev.type === "mousedown") {
    if (ev.shiftKey) {
      poke();
    }
    dragging = true;
    startPos = [ev.clientX, ev.clientY];
    startRotation = [globalRotation[0], globalRotation[1], globalRotation[2]];
    ev.target.classList.add("dragging");
  } else if (ev.type === "mouseup") {
    dragging = false; // Stop dragging
    ev.target.classList.remove("dragging");
  } else if (ev.type === "mousemove") {
    if (!dragging) return;
    const dx = ev.clientX - startPos[0]; // Calculate the change in x position
    const dy = ev.clientY - startPos[1]; // Calculate the change in y position

    // Calculate rotation (inverted controls)
    const sensitivity = 0.7; // Sensitivity of rotation
    const xRotation = -(dy * sensitivity) / 2;
    const yRotation = -(dx * sensitivity) / 2;

    setGlobalRotation(
      startRotation[0] + xRotation,
      startRotation[1] + yRotation,
      startRotation[2]
    ); // Set the global rotation
  }
}

let globalRotation = [0, 0, 0]; // Global rotation angles
let globalScale = 1;
function setGlobalRotation(x, y, z) {
  globalRotation[0] = x;
  globalRotation[1] = y;
  globalRotation[2] = z;

  globalRotateMatrix.setRotate(x, 1, 0, 0); // Rotate around x-axis
  globalRotateMatrix.rotate(y, 0, 1, 0); // Rotate around y-axis
  globalRotateMatrix.rotate(z, 0, 0, 1); // Rotate around z-axis
  globalRotateMatrix.scale(globalScale, globalScale, globalScale); // Scale
}

let neckRotation = 0;
let leafStemRotation = 0;
let walkingEnabled = true;
function main() {
  const canvas = document.getElementById("webgl", {
    preserveDrawingBuffer: true,
  });
  const gl = setupWebGL(canvas);
  if (!gl) return;

  const variables = connectVariablesToGLSL(gl);

  canvas.onmousedown = click.bind(null, gl, variables);
  canvas.onmousemove = click.bind(null, gl, variables);
  canvas.onmouseup = click.bind(null, gl, variables);

  const rotationSliderX = document.getElementById("rotation-x");
  rotationSliderX.addEventListener("input", function () {
    const rotationValue = parseFloat(rotationSliderX.value);
    setGlobalRotation(rotationValue, globalRotation[1], globalRotation[2]); // Rotate around x-axis
  });
  const rotationSliderY = document.getElementById("rotation-y");
  rotationSliderY.addEventListener("input", function () {
    const rotationValue = parseFloat(rotationSliderY.value);
    setGlobalRotation(globalRotation[0], rotationValue, 0); // Rotate around y-axis
  });
  const rotationSliderZ = document.getElementById("rotation-z");
  rotationSliderZ.addEventListener("input", function () {
    const rotationValue = parseFloat(rotationSliderZ.value);
    setGlobalRotation(globalRotation[0], globalRotation[1], rotationValue); // Rotate around z-axis
  });
  setGlobalRotation(-25, 45, 0); // Set initial rotation
  rotationSliderX.value = -25;
  rotationSliderY.value = 45;

  const neck = document.getElementById("neck");
  neck.addEventListener("input", function () {
    const rotationValue = parseFloat(neck.value);
    neckRotation = rotationValue;
  });

  const leafStem = document.getElementById("leaf-stem");
  leafStem.addEventListener("input", function () {
    const rotationValue = parseFloat(leafStem.value);
    leafStemRotation = rotationValue;
  });

  const walking = document.getElementById("walking");
  walking.addEventListener("input", function () {
    walkingEnabled = walking.checked;
    if (!walkingEnabled && currentAnimation === "walk") {
      currentAnimation = "idle";
    } else if (walkingEnabled && currentAnimation === "idle") {
      currentAnimation = "walk";
    }
  });

  const giveFriendsButton = document.getElementById("give-friends");
  const removeFriendsButton = document.getElementById("remove-friends");
  giveFriendsButton.addEventListener("click", function () {
    giveFriends();
    removeFriendsButton.style.display = "block"; // Show the remove friends button
  });
  removeFriendsButton.addEventListener("click", function () {
    shapes = shapes.filter((shape) => shape.name === "root"); // Keep only the root shape
    removeFriendsButton.style.display = "none"; // Hide the remove friends button
    globalScale = 1;
    setGlobalRotation(...globalRotation);
  });

  tick(gl, variables);
}
main();
