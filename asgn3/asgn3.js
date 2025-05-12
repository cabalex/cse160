import { BlockHandler } from "./blocks.js";
import { Matrix4 } from "./lib/cuon-matrix-cse160.js";
import { PlayerCamera } from "./camera.js";

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
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.enable(gl.BLEND);
  gl.lineWidth(5);

  // disable texture blurriness
  gl.viewport(0, 0, 800, 800);
  return gl;
}

let VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ModelMatrix;
attribute vec2 a_Uv;

varying vec2 v_Uv;
varying float v_FogDepth;

void main() {
  vec4 premultiplied = u_ViewMatrix * u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * premultiplied;

  v_Uv = a_Uv;
  v_FogDepth = -(premultiplied).z;
}
`;

let FSHADER_SOURCE = `
precision mediump float;
uniform sampler2D u_Texture0;
uniform vec4 u_BaseColor;
uniform float u_TexColorWeight;
varying vec2 v_Uv;

uniform vec4 u_FogColor;
uniform float u_FogNear;
uniform float u_FogFar;
varying float v_FogDepth;

void main() {
  vec4 image0 = texture2D(u_Texture0, v_Uv);
  vec4 fullColor = image0 * u_TexColorWeight + u_BaseColor * (1.0 - u_TexColorWeight);

  float fogAmount = smoothstep(u_FogNear, u_FogFar, v_FogDepth);
  gl_FragColor = mix(fullColor, u_FogColor, fogAmount);
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

  const VARIABLES = [
    "a_Position",
    "u_ModelMatrix",
    "u_ProjectionMatrix",
    "u_ViewMatrix",
    "u_ModelMatrix",
    "u_Texture0",
    "u_BaseColor",
    "u_TexColorWeight",
    "a_Uv",
    "u_FogColor",
    "u_FogNear",
    "u_FogFar",
  ];

  const output = {};
  for (let i = 0; i < VARIABLES.length; i++) {
    const variableName = VARIABLES[i];
    let variable;
    if (variableName.startsWith("u_")) {
      variable = gl.getUniformLocation(gl.program, VARIABLES[i]);
    } else {
      variable = gl.getAttribLocation(gl.program, VARIABLES[i]);
    }
    if (variable === null) {
      console.error(`Failed to get the storage location of ${VARIABLES[i]}`);
      return false;
    }
    output[variableName] = variable;
  }

  return output;
}

let blocks;
let camera;

function renderScene(gl, variables, delta) {
  const perf = performance.now(); // Start performance measurement
  // clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  blocks.render(gl, camera);

  camera.tick(delta, blocks);

  const camY = camera.position.elements[1];
  if (camY < 0 && camY > -10) {
    const factor = 1 - camY / -10;
    const fogNear = 30 * factor + 5;
    const fogFar = 50 * factor + 10;
    gl.uniform4fv(variables.u_FogColor, [
      0.5 * factor,
      0.5 * factor,
      1.0 * factor,
      1.0,
    ]);
    gl.uniform1f(variables.u_FogNear, fogNear);
    gl.uniform1f(variables.u_FogFar, fogFar);
  } else if (camY >= 0) {
    gl.uniform4fv(variables.u_FogColor, [0.5, 0.5, 1.0, 1.0]);
    gl.uniform1f(variables.u_FogNear, 25);
    gl.uniform1f(variables.u_FogFar, 30);
  } else {
    gl.uniform4fv(variables.u_FogColor, [0.0, 0.0, 0.0, 1.0]);
    gl.uniform1f(variables.u_FogNear, 5);
    gl.uniform1f(variables.u_FogFar, 10);
  }

  const perfEnd = performance.now(); // End performance measurement
  const perfTime = perfEnd - perf; // Calculate performance time
}

let time = 0;
let lastTime = performance.now(); // Initialize lastTime
let lastScore = 0;
function tick(gl, variables) {
  requestAnimationFrame(tick.bind(null, gl, variables)); // Request animation frame
  let newTime = performance.now();
  let delta = newTime - lastTime;
  time += delta / 1000;
  if (delta < 30) return;
  lastTime = newTime; // Update lastTime

  let renderedDelta = delta;
  if (delta > 1000) {
    renderedDelta = 0;
  }
  renderScene(gl, variables, renderedDelta); // Render the scene

  const renderTime = document.getElementById("render-time");
  renderTime.innerText = delta.toFixed(2);
  const fps = document.getElementById("fps");
  fps.innerText = (1000 / delta).toFixed(2); // Calculate and display FPS
  const position = document.getElementById("position");
  position.innerText = `xyz: ${camera.eye.elements[0].toFixed(
    2
  )}, ${camera.eye.elements[1].toFixed(2)}, ${camera.eye.elements[2].toFixed(
    2
  )}`;
  const depth = document.getElementById("depth");
  depth.innerText = Math.max(0, -camera.position.elements[1]).toFixed(1);

  const score = document.getElementById("score");
  if (blocks.score > lastScore) lastScore += (blocks.score - lastScore) / 10;
  else if (blocks.score < lastScore)
    lastScore -= (lastScore - blocks.score) / 10;
  score.innerText = lastScore.toFixed();
}

function mousemove(ev) {
  const dx = -ev.movementX / ev.target.width; // Calculate the change in x position
  const dy = ev.movementY / ev.target.height; // Calculate the change in y position

  camera.mousemove(dx, dy);
}

function handleKeyboard(gl, variables, blocks, mode, e) {
  if (e.repeat) return; // Ignore repeated key events
  const newState = mode === "down";
  const key = e.key;
  switch (key) {
    case "w":
    case "W":
      camera.setMovement("forward", newState);
      break;
    case "s":
    case "S":
      camera.setMovement("backward", newState);
      break;
    case "a":
    case "A":
      camera.setMovement("left", newState);
      break;
    case "d":
    case "D":
      camera.setMovement("right", newState);
      break;
    case "q":
    case "Q":
      camera.setMovement("panLeft", newState);
      break;
    case "e":
    case "E":
      camera.setMovement("panRight", newState);
      break;
    case "g":
    case "G":
      if (newState) upgradeTool(blocks);
      break;
    case "CLICK-2":
      if (newState) camera.addBlockFromCamera(blocks);
      break;
    case "CLICK-0":
      if (newState) {
        camera.removeBlockFromCamera(blocks);
      } else {
        blocks.stopMining();
      }
      break;
    case "Shift":
      camera.setMovement("run", newState);
      break;
    case " ":
      e.preventDefault();
      if (newState) {
        camera.jump();
      }
      break;
    default:
      break;
  }
}

function resize(gl) {
  const canvas = document.getElementById("webgl");
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);

  camera.resize(width, height);
}

const TOOLS = [
  { name: "wooden", pretty: "Wooden Pickaxe", cost: 0, speed: 1, radius: 0 },
  { name: "stone", pretty: "Stone Pickaxe", cost: 50, speed: 1.5, radius: 0 },
  {
    name: "iron",
    pretty: "Iron Pickaxe",
    cost: 1000,
    speed: 2,
    radius: 0,
  },
  {
    name: "gold",
    pretty: "Gold Driller Pickaxe",
    cost: 50000,
    speed: 2.5,
    radius: 1,
  },
  {
    name: "diamond",
    pretty: "Diamond Excavator",
    cost: 1000000,
    speed: 4,
    radius: 2,
  },
];
let currentTool = 0;

function updateTool() {
  const tool = document.getElementById("tool");
  const toolImg = document.getElementById("tool-img");
  const toolUpgradeButton = document.getElementById("tool-upgrade-button");

  tool.innerText = TOOLS[currentTool].pretty;
  if (currentTool >= TOOLS.length - 1) {
    toolUpgradeButton.style.display = "none";
  } else {
    toolUpgradeButton.innerText = `Upgrade for ${
      TOOLS[currentTool + 1].cost
    } pts (G)`;
  }
  toolImg.src = `./textures/${TOOLS[currentTool].name}.png`;
}

function upgradeTool(blocks) {
  if (currentTool >= TOOLS.length - 1) return;
  if (blocks.score >= TOOLS[currentTool + 1].cost) {
    blocks.score -= TOOLS[currentTool + 1].cost;
    currentTool++;
    blocks.miningSpeed = TOOLS[currentTool].speed;
    blocks.miningRadius = TOOLS[currentTool].radius ?? 1;
    updateTool();
  } else {
    const toolUpgradeButton = document.getElementById("tool-upgrade-button");
    const score = document.getElementById("score");
    toolUpgradeButton.style.animation = "shake 0.5s";
    score.style.animation = "shake 0.5s";
    setTimeout(() => {
      toolUpgradeButton.style.animation = "";
      score.style.animation = "";
    }, 500);
  }
}

let started = false;
function main() {
  const canvas = document.getElementById("webgl", {
    preserveDrawingBuffer: true,
  });
  camera = new PlayerCamera(canvas.width, canvas.height);
  const gl = setupWebGL(canvas);
  if (!gl) return;

  const variables = connectVariablesToGLSL(gl);

  blocks = new BlockHandler(gl, variables, camera);

  /*for (let i = 0; i < MAP.length; i++) {
    const block = MAP[i];
    if (block.type === "fill") {
      for (let x = block.from[0]; x <= block.to[0]; x++) {
        for (let y = block.from[1]; y <= block.to[1]; y++) {
          for (let z = block.from[2]; z <= block.to[2]; z++) {
            blocks.addBlock(block.block, [x, y, z]);
          }
        }
      }
    } else if (block.type === "line") {
      blocks.addLine(block.block, block.from, block.to);
    }
  }*/

  document.addEventListener(
    "keydown",
    handleKeyboard.bind(null, gl, variables, blocks, "down")
  );
  document.addEventListener(
    "keyup",
    handleKeyboard.bind(null, gl, variables, blocks, "up")
  );
  canvas.addEventListener("click", async () => {
    if (document.pointerLockElement === canvas) {
      return;
    }
    await canvas.requestPointerLock({
      unadjustedMovement: true,
    });
  });
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    handleKeyboard(gl, variables, blocks, "down", {
      key: `CLICK-${e.button}`,
      repeat: e.repeat,
    });
  });
  canvas.addEventListener("mouseup", (e) => {
    e.preventDefault();
    handleKeyboard(gl, variables, blocks, "up", {
      key: `CLICK-${e.button}`,
      repeat: e.repeat,
    });
  });
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      console.log("Pointer lock enabled");
      document.getElementById("menu").style.display = "none";
      document.addEventListener("mousemove", mousemove, false);
      if (!started) {
        // reset position
        camera.eye.elements[2] = 2;
        started = true;
      }
    } else {
      console.log("Pointer lock disabled");
      document.removeEventListener("mousemove", mousemove, false);
    }
  });

  // tools
  updateTool();

  resize(gl);
  window.addEventListener("resize", () => resize(gl));

  tick(gl, variables);
}
main();
