import PerlinNoise from "./lib/noise.js";

export function addFromMap(blocks, map) {
  for (let i = 0; i < map.length; i++) {
    const block = map[i];
    if (block.type === "fill") {
      for (let x = block.from[0]; x <= block.to[0]; x++) {
        for (let y = block.from[1]; y <= block.to[1]; y++) {
          for (let z = block.from[2]; z <= block.to[2]; z++) {
            if (block.block === "air") {
              blocks.removeBlock([x, y, z]);
            } else {
              blocks.addBlock(block.block, [x, y, z]);
            }
          }
        }
      }
    } else if (block.type === "line") {
      blocks.addLine(block.block, block.from, block.to);
    }
  }
}

function makeTree(blocks, x, y, z) {
  addFromMap(blocks, [
    { type: "fill", from: [x, y, z], to: [x, y + 1, z], block: "wood" },
    {
      type: "fill",
      from: [x - 1, y + 2, z - 1],
      to: [x + 1, y + 3, z + 1],
      block: "leaves",
    },
    {
      type: "fill",
      from: [x - 1, y + 4, z],
      to: [x + 1, y + 4, z],
      block: "leaves",
    },
    {
      type: "fill",
      from: [x, y + 4, z - 1],
      to: [x, y + 4, z + 1],
      block: "leaves",
    },
  ]);
}

const SEED = Date.now() % 1000;
function noise(width, height, x, y, z, scale = 1) {
  return PerlinNoise.noise(
    scale * (x / width + SEED),
    scale * (y / height + SEED),
    scale * (z / width + SEED)
  );
}

function placeIfThreshold(
  blocks,
  fn,
  x,
  y,
  z,
  block,
  threshold,
  scale = 1,
  fadeInAfterY = 0,
  fadeInAfterYEnd = 5
) {
  let n = fn(x, y, z, scale);
  if (y > fadeInAfterY) return;
  if (y < fadeInAfterYEnd) {
    n *= Math.sin(
      ((y - fadeInAfterY) / (fadeInAfterYEnd - fadeInAfterY)) * Math.PI
    );
  }
  if (n > threshold) {
    blocks.addBlock(block, [x, y, z]);
  }
}

// Linearly interpolate between a and b using y_min and y_max
function lerp(a, b, y_min, y_max, y) {
  const t = Math.min(1, (y - y_min) / (y_max - y_min));
  return a + (b - a) * t;
}

function* blockIterator(width, height, offsetY) {
  for (let x = -width; x <= width; x++) {
    for (let z = -width; z <= width; z++) {
      for (let y = -height * 2 - offsetY; y <= -offsetY; y++) {
        yield [x, y, z];
      }
    }
  }
}

export default function generateMap(
  blocks,
  offsetY = 0,
  width = 16,
  height = 32
) {
  const fn = noise.bind(null, width * 2, height);
  const place = placeIfThreshold.bind(null, blocks, fn);
  for (const [x, y, z] of blockIterator(width, height, offsetY)) {
    const depthFactor = Math.min(1, Math.abs(y) / 32);
    const n = fn(x, y, z, 2);
    if (n < 0.6 - 0.1 * depthFactor) {
      blocks.addBlock("stone", [x, y, z]);
    }
  }

  // Add surface
  if (offsetY === 0) {
    // place safe zone
    addFromMap(blocks, [
      {
        type: "fill",
        from: [-2, -1, -2],
        to: [2, 0, 2],
        block: "grass",
      },
    ]);
    const above5 = [];
    for (let [key, value] of blocks.blocks.entries()) {
      if (key > -5) {
        above5.push(...value.values());
      }
    }
    for (const block of above5) {
      if (block.name !== "stone") continue;
      if (
        blocks.getBlockAt(
          block.position[0],
          block.position[1] + 1,
          block.position[2]
        )
      ) {
        blocks.addBlock("dirt", block.position);
      } else {
        if (
          Math.random() < 0.01 &&
          (Math.abs(block.position[0]) > 5 || Math.abs(block.position[2]) > 5)
        ) {
          // Make tree :)
          makeTree(
            blocks,
            block.position[0],
            block.position[1] + 1,
            block.position[2]
          );
          blocks.addBlock("dirt", block.position);
        } else {
          blocks.addBlock("grass", block.position);
        }
      }
    }
    // place lighting house
    addFromMap(blocks, [
      {
        type: "fill",
        from: [-4, 1, -11],
        to: [4, 4, -3],
        block: "wooden_planks",
      },
      {
        type: "fill",
        from: [-4, 0, -11],
        to: [4, 0, -3],
        block: "brick",
      },
      {
        type: "fill",
        from: [-4, 2, -8],
        to: [4, 2, -6],
        block: "air",
      },
      {
        type: "fill",
        from: [-3, 1, -10],
        to: [3, 3, -4],
        block: "air",
      },
      {
        type: "fill",
        from: [0, 1, -3],
        to: [0, 2, -3],
        block: "air",
      },
    ]);
  }
  // Add ores
  for (const block of blocks.blockIterator(-offsetY - height * 2, -offsetY)) {
    if (block.position[1] > -5) {
      continue;
    }
    place(
      ...block.position,
      "dirt",
      lerp(0.3, 0.7, -5, -500, block.position[1]),
      lerp(0.2, 4, -5, -100, block.position[1])
    );
    place(
      ...block.position,
      "cobblestone",
      lerp(0.7, 0.3, -5, -500, block.position[1]),
      lerp(5, 0.1, -5, -100, block.position[1])
    );
    place(
      ...block.position,
      "coal_ore",
      lerp(0.7, 0.5, -5, -500, block.position[1]), // rate: lerp from 0.7 to 0.5 between -5 and -500
      lerp(20, 10, -5, -100, block.position[1]) // scale: lerp from 20 to 8 between -5 and -100
    );
    place(
      ...block.position,
      "iron_ore",
      lerp(0.9, 0.6, -50, -250, block.position[1]),
      lerp(40, 10, -5, -100, block.position[1]),
      -50,
      -100
    );
    place(
      ...block.position,
      "gold_ore",
      lerp(0.9, 0.7, -200, -300, block.position[1]),
      lerp(10, 20, -200, -400, block.position[1]),
      -200,
      -250
    );
    place(
      ...block.position,
      "diamond_ore",
      lerp(0.9, 0.75, -300, -550, block.position[1]),
      lerp(40, 18, -300, -600, block.position[1]),
      -300,
      -350
    );
  }
}
