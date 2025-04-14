class Shape {
  constructor(x, y, color, size) {
    this.type = "shape";
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.alpha = 1.0;
    this.size = size;
    this.originalSize = size;
    this.color = color;
    this.originalColor = { ...color };
    this.createdAt = Date.now();
  }
}

class Point extends Shape {
  constructor(x, y, color, size) {
    super(x, y, color, size);
    this.type = "point";
  }

  draw(gl, variables) {
    // Pass the position of a point to a_Position variable
    gl.vertexAttrib3f(variables.a_Position, this.x, this.y, 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(
      variables.u_FragColor,
      this.color.r,
      this.color.g,
      this.color.b,
      this.alpha
    );
    // Pass the size of a point to u_PointSize variable
    gl.uniform1f(variables.u_PointSize, this.size);
    // Draw a point
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

function renderTriangle(gl, points, color, variables, mode = "TRIANGLES") {
  var vertices = new Float32Array(points);
  var n = points.length / 2; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("Failed to create the buffer object");
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(variables.a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(variables.a_Position);
  if (n < 0) {
    console.log("Failed to set the positions of the vertices");
    return;
  }

  // Pass the color of a point to u_FragColor variable
  gl.uniform4f(variables.u_FragColor, color.r, color.g, color.b, color.a);

  // Draw the rectangle
  gl.drawArrays(gl[mode], 0, n);

  // Disable it again (in case we want to draw points)
  gl.disableVertexAttribArray(variables.a_Position);
}

class Triangle extends Shape {
  constructor(x, y, color, size) {
    super(x, y, color, size);
    this.type = "triangle";
  }

  draw(gl, variables) {
    // Pass the position of the vertices to a_Position variable
    let scaledSize = this.size / 200 / 2;
    renderTriangle(
      gl,
      [
        this.x,
        this.y + scaledSize,
        this.x - scaledSize,
        this.y - scaledSize,
        this.x + scaledSize,
        this.y - scaledSize,
      ],
      { ...this.color, a: this.alpha },
      variables
    );
  }
}

class Circle extends Shape {
  constructor(x, y, color, size, resolution) {
    super(x, y, color, size);
    this.type = "circle";
    this.resolution = resolution;
  }

  draw(gl, variables) {
    // Pass the position of the vertices to a_Position variable
    let scaledSize = this.size / 200 / 2;

    // A triangle is just a fan of triangles of the set depth
    let points = [this.x, this.y];
    for (let i = 0; i <= this.resolution; i++) {
      let angle = (i / this.resolution) * 2 * Math.PI;
      points.push(this.x + Math.cos(angle) * scaledSize);
      points.push(this.y + Math.sin(angle) * scaledSize);
    }
    renderTriangle(
      gl,
      points,
      { ...this.color, a: this.alpha },
      variables,
      "TRIANGLE_FAN"
    );
  }
}
