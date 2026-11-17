// Exports the creator voxel character to temp/lee-voxel.glb.
// Run from the project root: npx vite-node scripts/export-creator-glb.mjs
// .mjs like copy-ffmpeg.mjs: tsconfig.node.json type-checks scripts/*.ts without Node types.
import { writeFileSync } from 'node:fs';
import { BoxGeometry, BufferAttribute, Color, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildCreatorVoxelModel } from '../src/lib/creatorVoxelModel';

// GLTFExporter's binary path reads Blobs through FileReader, which Node lacks.
globalThis.FileReader = class {
  result = null;
  onloadend = null;
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
const root = new Group();
root.name = 'LeeVoxel';
root.scale.setScalar(1 / 15); // 26 voxels tall -> about 1.73 m

const color = new Color();
for (const part of buildCreatorVoxelModel()) {
  const [px, py, pz] = part.pivot;
  // Colours are baked per vertex: instance colours do not survive in most glTF importers.
  const boxes = part.boxes.map(([x, y, z, w, h, d, hex], i) => {
    const box = new BoxGeometry(w, h, d).translate(
      x + w / 2 - px,
      y + h / 2 - py,
      z + d / 2 - pz,
    );
    box.deleteAttribute('uv');
    // Same per-cube shade as CreatorVoxel.tsx.
    const shade = 0.9 + 0.1 * ((Math.imul(i, 2654435761) >>> 0) / 2 ** 32);
    color.setHex(hex).multiplyScalar(shade);
    const count = box.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let v = 0; v < count; v++) color.toArray(colors, v * 3);
    box.setAttribute('color', new BufferAttribute(colors, 3));
    return box;
  });

  const mesh = new Mesh(mergeGeometries(boxes), material);
  mesh.name = `${part.name}Mesh`;
  const joint = new Group();
  joint.name = part.name;
  joint.position.set(px, py, pz);
  joint.add(mesh);
  root.add(joint);
}

const glb = await new GLTFExporter().parseAsync(root, { binary: true });
const out = new URL('../temp/lee-voxel.glb', import.meta.url);
writeFileSync(out, Buffer.from(glb));
console.log(`wrote ${out.pathname} (${(glb.byteLength / 1024).toFixed(0)} kB)`);
