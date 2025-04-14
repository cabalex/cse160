let color = { r: 0, g: 0, b: 0 };
function setColor() {
  color.r = document.getElementById("color-r").value / 255.0;
  color.g = document.getElementById("color-g").value / 255.0;
  color.b = document.getElementById("color-b").value / 255.0;

  // set color picker
  const colorPicker = document.getElementById("color-picker");
  const hexColor =
    (color.r * 255).toString(16).padStart(2, "0") +
    (color.g * 255).toString(16).padStart(2, "0") +
    (color.b * 255).toString(16).padStart(2, "0");
  colorPicker.value = "#" + hexColor;
}

function setColorFromPicker() {
  const colorPicker = document.getElementById("color-picker");
  const hexColor = colorPicker.value;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  color.r = r / 255.0;
  color.g = g / 255.0;
  color.b = b / 255.0;

  // set RGB sliders
  document.getElementById("color-r").value = r;
  document.getElementById("color-g").value = g;
  document.getElementById("color-b").value = b;
}

let shapeSize = 10;
function setShapeSize() {
  shapeSize = document.getElementById("shape-size").value;
}

let circleResolution = 100;
function setCircleResolution() {
  circleResolution = document.getElementById("circle-resolution").value;
}

let shapeType = "point";
function setShapeType(type) {
  shapeType = type;

  const shapeButtons = document.querySelectorAll(".shape-btn");
  shapeButtons.forEach((button) => {
    if (button.id === "shape-" + type) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  if (shapeType === "circle") {
    document.getElementById("circle-settings").style.display = "block";
  } else {
    document.getElementById("circle-settings").style.display = "none";
  }
}

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
  return gl;
}

let VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_PointSize;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_PointSize;
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

  return { a_Position, u_FragColor, u_PointSize };
}

let shapes = [];
function renderAllShapes(gl, variables) {
  // clear the canvas
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let shape of shapes) {
    shape.draw(gl, variables, circleResolution);
  }
}

function clearShapes(gl, variables) {
  shapes = [];
  renderAllShapes(gl, variables);
}

function click(gl, variables, ev) {
  // Return if "mousemove" and no buttons are actually being pressed

  let x = ev.clientX; // x coordinate of a mouse pointer
  let y = ev.clientY; // y coordinate of a mouse pointer
  let rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - rect.width / 2) / (rect.width / 2);
  y = (rect.height / 2 - (y - rect.top)) / (rect.height / 2);

  let shapeToAdd;
  switch (shapeType) {
    case "point":
      shapeToAdd = new Point(x, y, { ...color }, shapeSize);
      break;
    case "triangle":
      shapeToAdd = new Triangle(x, y, { ...color }, shapeSize);
      break;
    case "circle":
      shapeToAdd = new Circle(x, y, { ...color }, shapeSize, circleResolution);
      break;
    default:
      console.error("Unknown shape type: " + shapeType);
      return;
  }

  if (ev.buttons === 0) {
    renderAllShapes(gl, variables);
    // Render a "ghost" image
    shapeToAdd.alpha = 0.5;
    shapeToAdd.draw(gl, variables, circleResolution);

    return;
  } else {
    // Add the shape to the list of shapes
    shapes.push(shapeToAdd);
    renderAllShapes(gl, variables);
  }
}

/* artwork */
function renderArt(gl, variables) {
  // reset variables that may cause the canvas to rerender
  if (funActive) {
    const funButton = document.getElementById("fun-btn");
    funButton.innerText = "Start FUN";
    funButton.classList.remove("active");
    funActive = false;
    // wait for the fun loop to finish before rendering the art
    setTimeout(() => {
      renderArt(gl, variables);
    }, 100);
    return;
  }
  if (rewinding) {
    const rewindButton = document.getElementById("rewind-btn");
    rewindButton.classList.remove("active");
    rewindButton.innerText = "Hold to Rewind";
    rewinding = false;
    // wait for the rewind loop to finish before rendering the art
    setTimeout(() => {
      renderArt(gl, variables);
    }, 100);
    return;
  }
  // clear the canvas
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const triangles = [
    // water
    [[-0.6, 0.4, 0.6, 0.4, -0.6, -0.6], { r: 0.2, g: 0.5, b: 1, a: 1 }],
    [[-0.6, -0.6, 0.6, 0.4, 0.6, -0.6], { r: 0.2, g: 0.5, b: 1, a: 1 }],
    // fish 1
    [[-0.2, 0.1, 0, 0, -0.2, -0.1], { r: 0.7, g: 0, b: 1, a: 1 }],
    [[0, 0, 0.2, -0.1, 0, -0.2], { r: 0.7, g: 0, b: 1, a: 1 }],
    [[-0.2, -0.1, 0, -0.2, -0.2, -0.3], { r: 0.7, g: 0, b: 1, a: 1 }],
    [[-0.4, 0, -0.2, -0.1, -0.4, -0.2], { r: 0.7, g: 0, b: 1, a: 1 }],
    // fish 2
    [[0.0, 0.2, 0.2, 0.3, 0.2, 0.1], { r: 1.0, g: 0.5, b: 0, a: 1 }],
    [[0.2, 0.2, 0.3, 0.25, 0.3, 0.15], { r: 1.0, g: 0.5, b: 0, a: 1 }],
    // plant 1
    [[0.2, -0.4, 0.4, -0.2, 0.4, -0.4], { r: 0.2, g: 0.7, b: 0, a: 1 }],
    [[0.2, -0.4, 0.4, -0.6, 0.2, -0.6], { r: 0.2, g: 0.7, b: 0, a: 1 }],
    // plant 2
    [[-0.2, -0.4, 0, -0.6, -0.2, -0.6], { r: 0.2, g: 0.7, b: 0, a: 1 }],
    // bowl
    [[-0.4, 0.8, 0.4, 0.8, -0.4, 0.5], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.4, 0.5, 0.4, 0.8, 0.4, 0.5], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.4, 0.6, 0.6, 0.5, 0.4, 0.5], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.4, 0.5, 0.6, 0.5, 0.6, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.6, 0.5, 0.8, 0.4, 0.6, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.6, 0.4, 0.6, -0.6, 0.8, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.8, 0.4, 0.8, -0.6, 0.6, -0.6], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[0.6, -0.6, 0.8, -0.6, 0.6, -0.8], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.6, -0.6, 0.6, -0.6, -0.6, -0.8], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.6, -0.8, 0.6, -0.6, 0.6, -0.8], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.6, -0.6, -0.8, -0.6, -0.6, -0.8], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.8, 0.4, -0.8, -0.6, -0.6, -0.6], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.6, 0.4, -0.6, -0.6, -0.8, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.6, 0.5, -0.8, 0.4, -0.6, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.4, 0.5, -0.6, 0.5, -0.6, 0.4], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
    [[-0.4, 0.6, -0.6, 0.5, -0.4, 0.5], { r: 0.7, g: 0.7, b: 0.7, a: 1 }],
  ];

  for (const triangle of triangles) {
    renderTriangle(gl, triangle[0], triangle[1], variables);
  }
}

/* tabs */
function setupTabs() {
  for (const tab of document.querySelectorAll(".tab")) {
    tab.onclick = () => {
      document.querySelectorAll(".tab.active").forEach((t) => {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      const target = tab.id.split("-")[1];
      const allTabs = document.querySelectorAll(".tab-content");
      allTabs.forEach((t) => {
        if (t.id !== target) {
          t.style.display = "none";
        } else {
          t.style.display = "flex";
        }
      });
    };
    if (tab.id === "tab-color") {
      tab.classList.add("active");
    }
  }
  for (const tabContent of document.querySelectorAll(".tab-content")) {
    if (tabContent.id !== "color") {
      tabContent.style.display = "none";
    }
  }
}
setupTabs();

/* fun */
let funType = "rainbow";
let funActive = false;
let funTime = 0;
function rainbow() {
  shapes.forEach((shape) => {
    shape.color.r = Math.sin(funTime + shape.x * 10) * 0.5 + 0.5;
    shape.color.g = Math.cos(funTime + shape.y * 10) * 0.5 + 0.5;
    shape.color.b = Math.sin(funTime + shape.x * 10 + shape.y * 10) * 0.5 + 0.5;
  });
}
function bubble() {
  shapes.forEach((shape) => {
    shape.size = shape.originalSize * Math.random();
  });
}
function jitter() {
  shapes.forEach((shape) => {
    shape.x += (Math.random() - 0.5) * 0.01;
    shape.y += (Math.random() - 0.5) * 0.01;
  });
}
function wave() {
  shapes.forEach((shape) => {
    shape.size =
      shape.originalSize * (1 + Math.sin(funTime + shape.x * 5 + shape.y * 5));
  });
}
function lavalamp() {
  shapes.forEach((shape) => {
    shape.y += Math.sin(funTime + shape.x * 5) * 0.01;
  });
}
const FUN_CTIONS = {
  rainbow,
  bubble,
  jitter,
  wave,
  lavalamp,
};
function funLoop(gl, variables) {
  if (funActive) {
    requestAnimationFrame(() => funLoop(gl, variables));
  }
  funTime = performance.now() / 1000;
  if (FUN_CTIONS[funType]) {
    FUN_CTIONS[funType]();
  } else {
    console.error("Unknown fun type: " + funType);
    return;
  }
  renderAllShapes(gl, variables);
}

/* rewind */
let rewinding = false;
let rewindTime = 0;
function rewindLoop(gl, variables) {
  if (!rewinding) return;
  rewindTime++;
  let delay = 100;
  if (rewindTime > 10) {
    delay = 50;
  }
  if (rewindTime > 20) {
    delay = 25;
  }
  if (rewindTime > 50) {
    delay = 15;
  }
  setTimeout(() => {
    rewindLoop(gl, variables);
  }, delay);
  shapes.pop();
  renderAllShapes(gl, variables);
}

function main() {
  const canvas = document.getElementById("webgl", {
    preserveDrawingBuffer: true,
  });
  const gl = setupWebGL(canvas);
  if (!gl) return;

  const variables = connectVariablesToGLSL(gl);

  renderAllShapes(gl, variables);

  canvas.onmousedown = click.bind(null, gl, variables);
  canvas.onmousemove = click.bind(null, gl, variables);
  canvas.onmouseout = renderAllShapes.bind(null, gl, variables);

  const renderArtButton = document.getElementById("render-art-btn");
  renderArtButton.onclick = () => {
    renderArt(gl, variables);
  };

  const clearButton = document.getElementById("clear-btn");
  clearButton.onclick = clearShapes.bind(null, gl, variables);

  const funButton = document.getElementById("fun-btn");
  const funResetButton = document.getElementById("fun-reset-btn");
  const funTypeSelect = document.getElementById("fun-type");
  funTypeSelect.onchange = () => {
    funType = funTypeSelect.value;
  };
  funResetButton.onclick = () => {
    shapes.forEach((shape) => {
      shape.size = shape.originalSize;
      shape.x = shape.originalX;
      shape.y = shape.originalY;
      shape.color = { ...shape.originalColor };
    });
    renderAllShapes(gl, variables);
  };
  funButton.onclick = (ev) => {
    funActive = !funActive;
    if (funActive) {
      funButton.innerText = "Stop FUN";
      funButton.classList.add("active");
      funLoop(gl, variables);
    } else {
      funButton.innerText = "Start FUN";
      funButton.classList.remove("active");
    }
  };

  const exportButton = document.getElementById("export-btn");
  exportButton.onclick = () => {
    // export canvas as image
    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "canvas.png";
    link.click();
  };

  const rewindButton = document.getElementById("rewind-btn");
  rewindButton.onmousedown = () => {
    rewindButton.classList.add("active");
    rewindButton.innerText = "Rewinding...";
    rewinding = true;
    rewindTime = 0;
    rewindLoop(gl, variables);
  };
  rewindButton.onmouseup = () => {
    rewindButton.classList.remove("active");
    rewindButton.innerText = "Hold to Rewind";
    rewinding = false;
  };
  rewindButton.onmouseleave = () => {
    rewindButton.classList.remove("active");
    rewindButton.innerText = "Hold to Rewind";
    rewinding = false;
  };
}
main();
