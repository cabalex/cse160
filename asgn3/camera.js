import { Vector3, Matrix4 } from "./lib/cuon-matrix-cse160.js";

export default class Camera {
  constructor(width, height) {
    this.fov = 60;
    this.eye = new Vector3([0, 0, 2]);
    this.at = new Vector3([0, 0, 0]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4().setLookAt(
      this.eye.elements[0],
      this.eye.elements[1],
      this.eye.elements[2],
      this.at.elements[0],
      this.at.elements[1],
      this.at.elements[2],
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
    this.width = width;
    this.height = height;
    this.projectionMatrix = new Matrix4().setPerspective(
      this.fov,
      this.width / this.height,
      0.1,
      1000
    );
    this.moving = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      panLeft: false,
      panRight: false,
      run: false,
    };
    this.startRotation = null; // for mouse rotation
    this.speed = 4; // Speed of camera movement
    this.alpha = 80; // Rotation angle around the Y-axis
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.updateCamera();
  }

  setMovement(direction, state) {
    this.moving[direction] = state;
  }

  updateCamera() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0],
      this.eye.elements[1],
      this.eye.elements[2],
      this.at.elements[0],
      this.at.elements[1],
      this.at.elements[2],
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
    this.projectionMatrix.setPerspective(
      this.fov,
      this.width / this.height,
      0.1,
      1000
    );
  }

  move(delta) {
    let deltaMovement = (delta * this.speed) / 1000;
    let alphaMovement = (delta * this.alpha) / 1000;
    if (this.moving.run) {
      deltaMovement *= 1.5; // Running speed
    }
    if (
      (this.moving.forward || this.moving.backward) &&
      (this.moving.left || this.moving.right)
    ) {
      // Diagonal movement
      deltaMovement *= 0.7;
    }
    if (this.moving.forward) {
      this.moveForward(deltaMovement);
    }
    if (this.moving.backward) {
      this.moveBackward(deltaMovement);
    }
    if (this.moving.left) {
      this.moveLeft(deltaMovement);
    }
    if (this.moving.right) {
      this.moveRight(deltaMovement);
    }
    if (this.moving.panLeft) {
      this.panLeft(alphaMovement);
      this.startRotation = null;
    }
    if (this.moving.panRight) {
      this.panRight(alphaMovement);
      this.startRotation = null;
    }
    this.updateCamera();
  }

  moveForward(speed = this.speed) {
    const r = this.rotation;
    r.elements[1] = 0; // ignore y rotation
    const f = r.normalize().mul(speed);
    this.eye.add(f);
    this.at.add(f);
  }

  moveBackward(speed = this.speed) {
    this.moveForward(-speed);
  }

  moveLeft(speed = this.speed) {
    const f = this.rotation;
    const s = Vector3.cross(this.up, f).normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
  }

  moveDown(speed = this.speed) {
    const s = new Vector3().set(this.up).mul(-1).normalize().mul(speed);
    this.eye.sub(s);
    this.at.sub(s);
  }

  moveUp(speed = this.speed) {
    const s = new Vector3().set(this.up).normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
  }

  moveRight(speed = this.speed) {
    const f = this.rotation;
    const s = Vector3.cross(f, this.up).normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
  }

  // mouse rotation
  mousestart() {
    this.startRotation = new Vector3().set(this.rotation);
  }
  mousemove(dx, dy) {
    if (!this.startRotation) {
      this.startRotation = new Vector3().set(this.rotation);
    }
    this.panLeft(dx * this.alpha);
    this.panDown(dy * this.alpha);
    this.updateCamera();
  }
  mouseend() {
    this.startRotation = null;
  }

  get rotation() {
    // get rotation around y in degrees
    return new Vector3().set(this.at).sub(this.eye);
  }

  get position() {
    return this.eye;
  }

  panLeft(alpha = this.alpha) {
    const f = this.rotation;
    const rotationMatrix = new Matrix4().setRotate(alpha, ...this.up.elements); // Rotate around the up vector
    const f_prime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye).add(f_prime);
  }

  panRight(alpha = this.alpha) {
    this.panLeft(-alpha);
  }

  panDown(alpha = this.alpha) {
    const f = this.rotation;
    if (this.rotation.elements[1] < -1.99 && alpha > 0) {
      alpha = 0; // prevent looking up
    } else if (this.rotation.elements[1] > 1.99 && alpha < 0) {
      alpha = 0; // prevent looking down
    }
    const sideways = Vector3.cross(this.up, f).normalize();
    const rotationMatrix = new Matrix4().setRotate(alpha, ...sideways.elements); // Rotate around the up vector
    const f_prime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye).add(f_prime);
  }

  panUp(alpha = this.alpha) {
    this.panDown(-alpha);
  }
}

export class PlayerCamera extends Camera {
  constructor(width, height) {
    super(width, height);
    this.velocity = new Vector3([0, 0, 0]);
    this.moveUp(5);
    this.terminalVelocity = 0.5;
    this.isJumping = false;
    this.bodySize = 0.25; // size of the player
  }

  collisionCheck(blocks, speed, direction) {
    const initial =
      direction === "left" || direction === "right"
        ? Vector3.cross(this.up, this.rotation)
        : this.rotation;
    const f = initial.normalize().mul(speed);
    f.elements[1] = 0; // ignore y rotation
    if (direction === "backward" || direction === "right") {
      f.mul(-1);
    }
    const newPosition = new Vector3().set(this.position).add(f);
    const roundedPos = newPosition.elements.map(Math.round);
    // get blocks on all sides
    const left = blocks.getBlockAt(
      roundedPos[0] - 1,
      roundedPos[1],
      roundedPos[2]
    );
    const right = blocks.getBlockAt(
      roundedPos[0] + 1,
      roundedPos[1],
      roundedPos[2]
    );
    const front = blocks.getBlockAt(
      roundedPos[0],
      roundedPos[1],
      roundedPos[2] + 1
    );
    const back = blocks.getBlockAt(
      roundedPos[0],
      roundedPos[1],
      roundedPos[2] - 1
    );

    if (!left && !right && !front && !back) {
      return true; // no collision
    }
    //if (back) back.color = [0.5, 0, 0, 1];
    //if (front) front.color = [1, 0, 0, 1];
    //if (left) left.color = [0, 1, 0, 1];
    //if (right) right.color = [0, 0.5, 0, 1];

    if (front) {
      // push player back
      newPosition.elements[2] = Math.min(
        newPosition.elements[2],
        front.position[2] - 0.6 - this.bodySize
      );
    }
    if (back) {
      // push player back
      newPosition.elements[2] = Math.max(
        newPosition.elements[2],
        back.position[2] + 0.6 + this.bodySize
      );
    }
    if (left) {
      // push player back
      newPosition.elements[0] = Math.max(
        newPosition.elements[0],
        left.position[0] + 0.6 + this.bodySize
      );
    }
    if (right) {
      // push player back
      newPosition.elements[0] = Math.min(
        newPosition.elements[0],
        right.position[0] - 0.6 - this.bodySize
      );
    }

    const f_prime = newPosition.sub(this.position);

    this.at.add(f_prime);
    this.eye.add(f_prime);
  }

  collisionCheckVertical(blocks, direction = "down") {
    const y = this.position.elements[1] + (direction === "up" ? 1.75 : -0.1);
    return (
      blocks.getBlockAt(
        Math.round(this.position.elements[0] - this.bodySize),
        Math.floor(y),
        Math.round(this.position.elements[2] - this.bodySize)
      ) ||
      blocks.getBlockAt(
        Math.round(this.position.elements[0] - this.bodySize),
        Math.floor(y),
        Math.round(this.position.elements[2] + this.bodySize)
      ) ||
      blocks.getBlockAt(
        Math.round(this.position.elements[0] + this.bodySize),
        Math.floor(y),
        Math.round(this.position.elements[2] - this.bodySize)
      ) ||
      blocks.getBlockAt(
        Math.round(this.position.elements[0] + this.bodySize),
        Math.floor(y),
        Math.round(this.position.elements[2] + this.bodySize)
      )
    );
  }

  move(delta, blocks) {
    let deltaMovement = (delta * this.speed) / 1000;
    let alphaMovement = (delta * this.alpha) / 1000;
    if (this.moving.run) {
      deltaMovement *= 1.5; // Running speeda
    }
    if (
      (this.moving.forward || this.moving.backward) &&
      (this.moving.left || this.moving.right)
    ) {
      // Diagonal movement
      deltaMovement *= 0.7;
    }
    if (!(this.moving.forward && this.moving.backward)) {
      if (
        this.moving.forward &&
        this.collisionCheck(blocks, deltaMovement, "forward")
      ) {
        this.moveForward(deltaMovement);
      }
      if (
        this.moving.backward &&
        this.collisionCheck(blocks, deltaMovement, "backward")
      ) {
        this.moveBackward(deltaMovement);
      }
    }
    if (
      this.moving.left &&
      this.collisionCheck(blocks, deltaMovement, "left")
    ) {
      this.moveLeft(deltaMovement);
    }
    if (
      this.moving.right &&
      this.collisionCheck(blocks, deltaMovement, "right")
    ) {
      this.moveRight(deltaMovement);
    }
    if (this.moving.panLeft) {
      this.panLeft(alphaMovement);
      this.startRotation = null;
    }
    if (this.moving.panRight) {
      this.panRight(alphaMovement);
      this.startRotation = null;
    }
  }

  get position() {
    return new Vector3([0, -1, 0]).add(this.eye); // Adjust the position to be at the player's feet
  }

  jump() {
    if (this.velocity.elements[1] === 0) {
      this.velocity.elements[1] = 0.25; // set jump velocity
      this.isJumping = true;
      setTimeout(() => {
        this.isJumping = false;
      }, 100);
    }
  }

  addBlockFromCamera(blocks) {
    let position = blocks.raycast(this.position, this.rotation, true);
    if (position) {
      const rounded = this.position.elements.map(Math.round);
      if (
        position[0] === rounded[0] &&
        (position[1] === rounded[1] || position[1] === rounded[1] + 1) &&
        position[2] === rounded[2]
      ) {
        return; // don't add block if it's the same position
      }
      blocks.addBlock("wooden_planks", position);
    }
  }

  removeBlockFromCamera(blocks) {
    let block = blocks.raycast(this.position, this.rotation, false);
    if (block && (block.name !== "bedrock" || block.name !== "wall")) {
      blocks.startMining(block.position);
    }
  }

  tick(delta, blocks) {
    this.moveDown(this.velocity.elements[1] * delta * 0.05);
    // check for collisions
    let blockBelow = this.collisionCheckVertical(blocks, "down");

    if (blockBelow && !this.isJumping) {
      //blockBelow.color = [0.5, 0, 0, 1];
      this.velocity.elements[1] = 0; // stop vertical movement
      this.moveUp(blockBelow.position[1] - this.position.elements[1] + 1); // move up to block
    } else {
      // fall until terminal velocity
      this.velocity.elements[1] = Math.max(
        -this.terminalVelocity,
        this.velocity.elements[1] - (0.9 * delta) / 1000
      );
    }

    // add velocity
    this.move(delta, blocks);

    let blockAbove = this.collisionCheckVertical(blocks, "up");
    if (blockAbove) {
      //blockAbove.color = [0.5, 0, 0, 1];
      this.velocity.elements[1] = -0.01; // stop vertical movement
      this.moveDown(blockAbove.position[1] - this.position.elements[1] - 1.75); // move down to block
    }
    blocks.raycast(this.position, this.rotation);
    this.updateCamera();
  }
}
