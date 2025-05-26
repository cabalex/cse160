import { Shape3D, BlockHandler, Block, Sphere } from "./blocks.js";
import { Matrix4, Vector3 } from "./lib/cuon-matrix-cse160.js";
import { PlayerCamera } from "./camera.js";
import { OBJLoader } from "./lib/OBJLoader.js";

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
uniform bool u_ShowNormals;
uniform vec3 u_LightPosition;
uniform vec3 u_SpotlightPosition;
uniform vec3 u_SpotlightDirection;
uniform float u_SpotlightCutoff;
uniform float u_SpotlightEnabled;

attribute vec2 a_Uv;
attribute vec3 a_Normal;


varying vec2 v_Uv;
varying vec3 v_Normal;
varying vec3 v_Light;
varying float v_LightDistance;
varying vec3 v_VertexPosition;
varying vec3 v_LightPosition;
varying float v_SpotlightIntensity;

void main() {
  vec4 premultiplied =  u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * premultiplied;

  v_Uv = a_Uv;
  v_Normal = normalize(a_Normal);
  v_LightDistance = length(u_LightPosition - premultiplied.rgb);
  v_VertexPosition = (u_ViewMatrix * premultiplied).rgb;
  v_LightPosition = normalize(u_LightPosition - premultiplied.rgb); 
  v_Light = normalize(u_LightPosition - v_VertexPosition);

  // calculate spotlight
  // 1. calculate vector from vertex to spotlight position
  vec3 spotlightVector = normalize(premultiplied.rgb - u_SpotlightPosition);
  float spotlightDistance = length(premultiplied.rgb - u_SpotlightPosition);

  // 2. calculate angle between spotlight direction and light direction
  float angle = dot( normalize(u_SpotlightDirection), spotlightVector);

  // 3. set intensity based on angle between cutoff and distance
  v_SpotlightIntensity = clamp((radians(u_SpotlightCutoff) - acos(angle)) * 3.0, 0.0, 2.0);
  v_SpotlightIntensity = v_SpotlightIntensity * clamp(1.0 - spotlightDistance / 14.0, 0.0, 1.0) * u_SpotlightEnabled;
}
`;

let FSHADER_SOURCE = `
precision mediump float;
uniform sampler2D u_Texture0;
uniform vec4 u_BaseColor;
uniform float u_TexColorWeight;
uniform bool u_ShowNormals;
uniform vec3 u_LightPosition;
uniform float u_UseLighting;

varying vec2 v_Uv;
varying vec3 v_Normal;
varying vec3 v_Light;
varying vec3 v_LightPosition;
varying vec3 v_VertexPosition;
varying float v_LightDistance;
varying float v_SpotlightIntensity;

//varying vec3 vertPos;       // Vertex position (may still need for vector to viewer)
uniform float u_Ka;   // Ambient reflection coefficient
uniform float u_Kd;   // Diffuse reflection coefficient
uniform float u_Ks;   // Specular reflection coefficient
uniform float u_shininessVal; // Shininess
// Material color
uniform vec3 u_ambientColor;
uniform vec3 u_specularColor;


vec4 calculatePhong(vec4 fullColor) {
  // Lambert's cosine law - https://www.cs.toronto.edu/~jacobson/phong-demo/
  float lambertian = max(dot(v_Normal, v_LightPosition), 0.0);
  float specular = 0.0;
  if(lambertian > 0.0) {
    vec3 R = reflect(-v_Light, v_Normal);      // Reflected light vector
    vec3 V = normalize(-v_VertexPosition); // Vector to viewer
    // Compute the specular term
    float specAngle = max(dot(R, V), 0.0);
    specular = pow(specAngle, u_shininessVal);
  }
  return vec4((u_Ka * u_ambientColor +
                      u_Kd * lambertian * (fullColor.rgb + u_specularColor.rgb) +
                      u_Ks * specular * u_specularColor) * clamp(1.0 - (v_LightDistance / 8.0), 0.0, 1.0), fullColor.a);
}

void main() {
  vec4 fullColor = vec4(1.0, 1.0, 1.0, 1.0);
  if (u_ShowNormals) {
    // Show normals as color
    vec3 normalColor = normalize(v_Normal) * 0.5 + 0.5; // Normalize to [0, 1]
    fullColor = vec4(normalColor, 1.0);
  } else {
    // Show texture and base color
    vec4 image0 = texture2D(u_Texture0, v_Uv);
    fullColor = image0 * u_TexColorWeight + u_BaseColor * (1.0 - u_TexColorWeight);
  }

  gl_FragColor = calculatePhong(fullColor);
  gl_FragColor.rgb += fullColor.rgb * v_SpotlightIntensity;
  gl_FragColor.rgb = u_UseLighting * gl_FragColor.rgb + (1.0 - u_UseLighting) * fullColor.rgb;
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
    "a_Normal",
    "u_ShowNormals",
    "u_LightPosition",
    "u_Ka",
    "u_Kd",
    "u_Ks",
    "u_shininessVal",
    "u_ambientColor",
    "u_specularColor",
    "u_UseLighting",
    "u_SpotlightPosition",
    "u_SpotlightDirection",
    "u_SpotlightCutoff",
    "u_SpotlightEnabled",
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
      console.warn(`Failed to get the storage location of ${VARIABLES[i]}`);
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
  lastTime = newTime; // Update lastTime

  let renderedDelta = delta;
  if (delta > 100) {
    renderedDelta = 0;
  }

  // ASGN4
  gl.uniform1i(variables.u_ShowNormals, showNormals);
  const normals = document.getElementById("normals");
  normals.innerText = showNormals ? "ON" : "OFF";
  const lightingText = document.getElementById("use-lighting");
  lightingText.innerText = useLighting ? "ON" : "OFF";
  const flashlightText = document.getElementById("use-flashlight");
  flashlightText.innerText = ["OFF", "ON", "DROPPED"][flashlightMode];
  lightPosition.elements[0] = Math.sin(time) * lightRadius;
  lightPosition.elements[1] = 2;
  lightPosition.elements[2] = Math.cos(time) * lightRadius - 7;
  lightVisual.setPosition(lightPosition.elements);
  lightVisual.setRotation([0, (time * 57) % 90, 0]);
  gl.uniform3fv(variables.u_LightPosition, lightPosition.elements);
  gl.uniform3fv(variables.u_specularColor, lightVisual.color.slice(0, 3));
  if (flashlightMode === 1) {
    // Handheld flashlight - stick to camera
    gl.uniform3fv(
      variables.u_SpotlightPosition,
      camera.position.add(new Vector3([0, 1, 0])).elements
    );
    gl.uniform3fv(
      variables.u_SpotlightDirection,
      new Vector3()
        .set(camera.at)
        .sub(camera.position)
        .sub(new Vector3([0, 1, 0])).elements
    );
    gl.uniform1f(variables.u_SpotlightCutoff, 30);
  }
  gl.uniform1f(variables.u_SpotlightEnabled, flashlightMode > 0 ? 1.0 : 0.0);

  renderScene(gl, variables, renderedDelta); // Render the scene

  gl.uniform1f(variables.u_UseLighting, 0.0);
  lightVisual.render(gl, variables, camera);
  gl.uniform1f(variables.u_UseLighting, useLighting ? 1.0 : 0.0);

  gl.uniform1f(variables.u_Ks, 1.0);
  gl.uniform1f(variables.u_shininessVal, 20);
  sphere.render(gl, variables, camera);
  teapot.render(gl, variables, camera);
  gl.uniform1f(variables.u_Ks, 0.0);
  gl.uniform1f(variables.u_shininessVal, 100);

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
    case "n":
    case "N":
      if (newState) {
        showNormals = !showNormals;
      }
      break;
    case "l":
    case "L":
      if (newState) {
        useLighting = !useLighting;
      }
      break;
    case "f":
    case "F":
      if (newState) {
        flashlightMode = (flashlightMode + 1) % 3;
      }
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
    speed: 3,
    radius: 0,
  },
  {
    name: "gold",
    pretty: "Gold Driller Pickaxe",
    cost: 50000,
    speed: 5,
    radius: 1,
  },
  {
    name: "diamond",
    pretty: "Diamond Excavator",
    cost: 1000000,
    speed: 10,
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

// ASGN4
let showNormals = false;
let lightPosition = new Vector3(2, 2, 2);
let useLighting = true;
let flashlightMode = 0;
let lightRadius = 3;
let lightVisual = new Block(null, {
  name: "glowstone",
  position: [0, 2, 0],
  scale: [0.5, 0.5, 0.5],
  color: [1, 0, 0, 0.5],
});
let teapot = new Shape3D();
teapot.render = function (gl, variables, camera) {
  teapot._render(teapot.vertices, gl, variables, camera);
};
const loader = new OBJLoader("lib/teapot.obj");
loader.parseModel().then(() => {
  let modelData = loader.getModelData();

  const combinedVertices = [];
  for (let i = 0; i < modelData.vertices.length; i += 3) {
    combinedVertices.push(
      modelData.vertices[i],
      modelData.vertices[i + 1],
      modelData.vertices[i + 2],
      0,
      0,
      modelData.normals[i],
      modelData.normals[i + 1],
      modelData.normals[i + 2]
    );
  }

  teapot.vertices = new Float32Array(combinedVertices);
});
const sphere = new Sphere(2, 20, 20);
sphere.setPosition([0, 0.5, -7]);
sphere.setScale([0.5, 0.5, 0.5]);
teapot.setScale([0.25, 0.25, 0.25]);
teapot.setPosition([0, 1.5, -7]);

function main() {
  const canvas = document.getElementById("webgl", {
    preserveDrawingBuffer: true,
  });
  camera = new PlayerCamera(canvas.width, canvas.height);
  const gl = setupWebGL(canvas);
  if (!gl) return;

  const variables = connectVariablesToGLSL(gl);

  // set up phong shading
  gl.uniform1f(variables.u_Ka, 0.2);
  gl.uniform1f(variables.u_Kd, 0.5);
  gl.uniform1f(variables.u_Ks, 0.3);
  gl.uniform3fv(variables.u_ambientColor, [0.2, 0.2, 1.0]);
  gl.uniform3fv(variables.u_specularColor, [1.0, 1.0, 1.0]);
  gl.uniform1f(variables.u_shininessVal, 100);

  blocks = new BlockHandler(gl, variables, camera);

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
  document.getElementById("normals").addEventListener("click", () => {
    showNormals = !showNormals;
  });
  document.getElementById("use-lighting").addEventListener("click", () => {
    useLighting = !useLighting;
  });
  document.getElementById("use-flashlight").addEventListener("click", () => {
    flashlightMode = (flashlightMode + 1) % 3;
  });
  document.getElementById("hue-slider").addEventListener("input", (e) => {
    const h = e.target.value;
    // Convert hue to RGB
    let f = (n, k = (n + h / 60) % 6) =>
      1 - 1 * 1 * Math.max(Math.min(k, 4 - k, 1), 0);

    lightVisual.color = [f(5), f(3), f(1), 0.2];
  });
  document.getElementById("light-radius").addEventListener("input", (e) => {
    lightRadius = e.target.value;
  });

  // tools
  updateTool();

  resize(gl);
  window.addEventListener("resize", () => resize(gl));

  tick(gl, variables);
}
main();
