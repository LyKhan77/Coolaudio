// Voxel chibi of the creator, stylized from temp/Lee-3views.png.
// Units are voxels. Y is up, the character faces +Z, its left is +X.

/** Min corner, size, colour. */
export type VoxelBox = readonly [
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
];

export interface VoxelPart {
  name: 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR' | 'deck' | 'platterL' | 'platterR';
  /** Joint the part rotates around. */
  pivot: readonly [number, number, number];
  boxes: VoxelBox[];
}

const SKIN = 0xf2cfae;
const HAIR = 0x1b1615;
const HAIR_FADE = 0x2e2725;
const EYE = 0x2a1c14;
const MOUTH = 0xc48d78;
const OLIVE = 0x414f27;
const OLIVE_RIB = 0x2f3a1c;
const INK = 0x151517;
const PANTS = 0x202024;
const WHITE = 0xf4f4f0;
const SILVER = 0xb9bec6;
const DECK = 0x2b2b31;
const VINYL = 0x0e0e10;
const ACCENT = 0xff5a1f; // site --accent
const PRIMARY = 0x1f4bff; // site --primary

/** Deterministic per-cell noise, so the model is identical on every load. */
export function cellHash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

type ColorAt = (x: number, y: number, z: number) => number | null;

/** Adds one unit cube per cell in the inclusive range, skipping cells that return null. */
function fill(
  out: VoxelBox[],
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
  [z0, z1]: [number, number],
  colorAt: ColorAt,
): void {
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        const color = colorAt(x, y, z);
        if (color !== null) out.push([x, y, z, 1, 1, 1, color]);
      }
    }
  }
}

const mirror = ([x, y, z, w, h, d, c]: VoxelBox): VoxelBox => [-(x + w), y, z, w, h, d, c];

function headColor(x: number, y: number, z: number): number {
  const side = x === -5 || x === 4;
  if (y >= 22) return HAIR;
  // Back of the head: full hair on top, faded undercut below, bare nape.
  if (z <= -3) return y >= 19 ? HAIR : y >= 17 ? HAIR_FADE : SKIN;
  if (side && z <= 2) {
    if (y >= 20) return HAIR;
    return y >= 18 && z <= -1 ? HAIR_FADE : SKIN;
  }
  if (z === 3) {
    if (y === 21) return x >= -2 && x <= 1 ? SKIN : HAIR; // parted fringe
    if (y === 20 && side) return HAIR;
    if ((y === 18 || y === 19) && (x === -3 || x === 2)) return EYE;
    if (y === 17 && (x === -1 || x === 0)) return MOUTH;
  }
  return SKIN;
}

function buildHead(): VoxelBox[] {
  const boxes: VoxelBox[] = [];
  fill(boxes, [-5, 4], [16, 23], [-4, 3], headColor);

  // Messy tufts on top and a fringe overhang in front.
  fill(boxes, [-4, 3], [24, 24], [-3, 2], (x, y, z) => (cellHash(x, y, z) % 3 ? HAIR : null));
  fill(boxes, [-4, 3], [25, 25], [-3, 2], (x, y, z) =>
    cellHash(x, 24, z) % 3 && cellHash(x, y, z) % 4 === 0 ? HAIR : null,
  );
  fill(boxes, [-4, 3], [22, 23], [4, 4], (x, y, z) => (cellHash(x, y, z) % 2 ? HAIR : null));

  // Thin (non-voxel) pieces, authored for the +X side and mirrored.
  const oneSide: VoxelBox[] = [
    // glasses: lens frame, then the temple arm back to the ear
    [0.8, 20.0, 4, 3.4, 0.3, 0.3, INK],
    [0.8, 17.7, 4, 3.4, 0.3, 0.3, INK],
    [0.8, 17.7, 4, 0.3, 2.6, 0.3, INK],
    [3.9, 17.7, 4, 0.3, 2.6, 0.3, INK],
    [4.2, 19.2, 4, 0.9, 0.3, 0.3, INK],
    [5.0, 19.2, 0.5, 0.3, 0.3, 3.8, INK],
    // ear
    [5, 18, 0, 1, 2, 1, SKIN],
    // earbud: bud seated in the ear, stem hanging down
    [5.0, 17.9, 0.3, 1.6, 1.1, 1.0, WHITE],
    [6.1, 16.7, 0.8, 0.5, 1.2, 0.5, WHITE],
  ];
  boxes.push(...oneSide, ...oneSide.map(mirror));
  boxes.push([-0.8, 19.2, 4, 1.6, 0.3, 0.3, INK]); // glasses bridge
  return boxes;
}

/** Olive knit with black paint blotches that drip down from the chest. */
function sweaterColor(x: number, y: number, z: number): number {
  if (y === 8) return OLIVE_RIB;
  if (y >= 11 && y <= 13 && x >= -3 && x <= 2) return INK;
  if (y >= 9 && y <= 10 && (x === -3 || x === -1 || x === 1)) return INK;
  return cellHash(x, y, z) % 7 === 0 ? INK : OLIVE;
}

function buildTorso(): VoxelBox[] {
  const boxes: VoxelBox[] = [];
  fill(boxes, [-4, 3], [8, 14], [-2, 1], (x, y, z) => {
    const centre = x === -1 || x === 0;
    if (z === 1) {
      if (y === 14 && centre) return INK; // tee collar
      if ((y === 14 && (x === -2 || x === 1)) || (y === 13 && centre)) return SILVER; // chain
    }
    if (z === -2 && y === 14 && centre) return SILVER;
    return sweaterColor(x, y, z);
  });
  fill(boxes, [-1, 0], [15, 15], [-1, 0], () => SKIN); // neck
  return boxes;
}

function buildArm(x0: number): VoxelBox[] {
  const boxes: VoxelBox[] = [];
  fill(boxes, [x0, x0 + 1], [8, 14], [-1, 0], (x, y, z) => {
    if (y === 8) return OLIVE_RIB;
    const blotch = y <= 11 ? cellHash(x, y, z) % 2 === 0 : y === 12 && cellHash(x, y, z) % 4 === 0;
    return blotch ? INK : OLIVE;
  });
  fill(boxes, [x0, x0 + 1], [7, 7], [-1, 0], () => SKIN); // hand
  return boxes;
}

function buildLeg(x0: number): VoxelBox[] {
  const boxes: VoxelBox[] = [];
  fill(boxes, [x0, x0 + 2], [2, 7], [-2, 1], () => PANTS);
  // Black-and-white sneaker: white sole, toe and side panel.
  fill(boxes, [x0, x0 + 2], [0, 1], [-2, 2], (_x, y, z) =>
    y === 0 || z === 2 || z === -1 || z === 0 ? WHITE : INK,
  );
  return boxes;
}

export function buildCreatorVoxelModel(): VoxelPart[] {
  return [
    { name: 'head', pivot: [0, 16, 0], boxes: buildHead() },
    { name: 'torso', pivot: [0, 8, 0], boxes: buildTorso() },
    { name: 'armL', pivot: [5, 14.5, 0], boxes: buildArm(4) },
    { name: 'armR', pivot: [-5, 14.5, 0], boxes: buildArm(-6) },
    { name: 'legL', pivot: [2.5, 8, 0], boxes: buildLeg(1) },
    { name: 'legR', pivot: [-2.5, 8, 0], boxes: buildLeg(-4) },
  ];
}

/** A record platter centred on (cx, 10, 7.5): the pivot it spins around. */
function buildPlatter(cx: number, label: number): VoxelBox[] {
  return [
    // three strips, so no two top faces overlap
    [cx - 2.5, 10, 6, 5, 0.5, 3, VINYL],
    [cx - 1.5, 10, 5, 3, 0.5, 1, VINYL],
    [cx - 1.5, 10, 9, 3, 0.5, 1, VINYL],
    [cx - 0.75, 10.5, 6.75, 1.5, 0.1, 1.5, label],
    [cx + 1.2, 10.5, 7.25, 1, 0.1, 0.5, WHITE], // marker that makes the spin visible
  ];
}

/** DJ booth in front of the character. Kept out of buildCreatorVoxelModel so the GLB stays a bare character. */
export function buildDjDeck(): VoxelPart[] {
  return [
    {
      name: 'deck',
      pivot: [0, 3, 7.5],
      boxes: [
        [-8, 3, 4, 16, 7, 7, DECK],
        [-8, 6, 11, 16, 1, 0.2, ACCENT],
        // mixer: two knobs and a crossfader
        [-1, 10, 6, 0.8, 0.6, 0.8, ACCENT],
        [0.2, 10, 6, 0.8, 0.6, 0.8, PRIMARY],
        [-0.6, 10, 8.5, 1.2, 0.4, 0.6, WHITE],
      ],
    },
    { name: 'platterL', pivot: [4.5, 10, 7.5], boxes: buildPlatter(4.5, ACCENT) },
    { name: 'platterR', pivot: [-4.5, 10, 7.5], boxes: buildPlatter(-4.5, PRIMARY) },
  ];
}
