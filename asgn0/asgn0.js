function getCanvasContext() {
  var canvas = document.getElementById("example");
  if (!canvas) {
    console.log("Failed to retrieve the <canvas> element");
    return;
  }
  var ctx = canvas.getContext("2d");
  if (!ctx) {
    console.log("Failed to get the rendering context for 2D canvas");
    return;
  }
  return ctx;
}

function drawVector(v, color) {
  const ctx = getCanvasContext();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 200);
  ctx.lineTo(200 + v.elements[0] * 20, 200 - v.elements[1] * 20);
  ctx.stroke();
}

function main() {
  const v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function handleDrawEvent() {
  // clear the canvas
  const ctx = getCanvasContext();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // read values from the input fields
  const x = parseFloat(document.getElementById("x").value);
  const y = parseFloat(document.getElementById("y").value);
  const x2 = parseFloat(document.getElementById("x2").value);
  const y2 = parseFloat(document.getElementById("y2").value);
  const operation = document.getElementById("operation").value;
  const scalar = parseFloat(document.getElementById("scalar").value);

  const v1 = new Vector3([x, y, 0]);
  const v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  // Handle the selected operation
  let resultVectors = [];
  let output = null;
  switch (operation) {
    case "add":
      resultVectors.push(v1.add(v2));
      break;
    case "sub":
      resultVectors.push(v1.sub(v2));
      break;
    case "mul":
      resultVectors.push(v1.mul(scalar), v2.mul(scalar));
      break;
    case "div":
      resultVectors.push(v1.div(scalar), v2.div(scalar));
      break;
    case "magnitude":
      console.log("Magnitude v1:", v1.magnitude());
      console.log("Magnitude v2:", v2.magnitude());
      output = `Magnitude v1: ${v1.magnitude()}<br>Magnitude v2: ${v2.magnitude()}`;
      break;
    case "normalize":
      resultVectors.push(v1.normalize(), v2.normalize());
      break;
    case "angle":
      // dot(v1, v2) = |v1| * |v2| * cos(theta)
      // theta = acos(dot(v1, v2) / (|v1| * |v2|))
      // (But also need to convert to degrees)
      let angle =
        (Math.acos(Vector3.dot(v1, v2) / (v1.magnitude() * v2.magnitude())) /
          (2 * Math.PI)) *
        360;
      console.log("Angle:", angle);
      output = `Angle: ${angle}`;
      break;
    case "area":
      // Area of the parallelogram: ||v1 x v2||
      // So, area of the triangle is half of that
      console.log(
        "Area of the triangle:",
        Vector3.cross(v1, v2).magnitude() / 2
      );
      output = `Area of the triangle: ${Vector3.cross(v1, v2).magnitude() / 2}`;
      break;
  }

  for (let i = 0; i < resultVectors.length; i++) {
    drawVector(resultVectors[i], "green");
  }
  const outputElem = document.getElementById("output");
  if (output !== null) {
    outputElem.innerHTML = output;
  } else {
    outputElem.innerHTML = "";
  }
}

// disable scalar input if not used here
function handleDisableScalar() {
  const operation = document.getElementById("operation").value;
  if (operation === "mul" || operation === "div") {
    document.getElementById("scalar").disabled = false;
  } else {
    document.getElementById("scalar").disabled = true;
  }
}
