import PerlinNoise from "./lib/noise.js";

function addFromMap(blocks, map) {
  for (let i = 0; i < map.length; i++) {
    const block = map[i];
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
    n *= Math.sin(((y - fadeInAfterY) / Math.abs(fadeInAfterYEnd)) * Math.PI);
  }
  if (n > threshold) {
    blocks.addBlock(block, [x, y, z]);
  }
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
    const above5 = [...blocks.blocks.values()].filter(
      (block) => block.position[1] > -5
    );
    for (const block of above5) {
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
  }
  // Add ores
  for (const [x, y, z] of blockIterator(width, height, offsetY)) {
    if (!blocks.getBlockAt(x, y, z) || y > -5) {
      continue;
    }
    place(x, y, z, "coal_ore", 0.5, 5);
    place(x, y, z, "iron_ore", 0.65, 10, -50, -100);
    place(x, y, z, "gold_ore", 0.7, 20, -200, -250);
    place(x, y, z, "diamond_ore", 0.8, 18, -500, -550);
  }
}
