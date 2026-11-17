import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const INK = [0x0f, 0x13, 0x22, 0xff];
const PRIMARY = [0x1f, 0x4b, 0xff, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBytes = Buffer.alloc(4);
  lenBytes.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBytes, typeBytes, data, crcBytes]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function sampleIconPixel(vx, vy) {
  // Coordinates match public/favicon.svg (32x32 viewBox)
  const strokeHalf = 0.75; // stroke-width 1.5 -> half = 0.75
  const d1 = distToSegment(vx, vy, 11, 9, 11, 23);
  const d2 = distToSegment(vx, vy, 11, 23, 22, 16);
  const d3 = distToSegment(vx, vy, 22, 16, 11, 9);
  if (Math.min(d1, d2, d3) <= strokeHalf) {
    return INK;
  }

  if (pointInTriangle(vx, vy, 11, 9, 11, 23, 22, 16)) {
    return WHITE;
  }

  // Outer rect: x=2, y=2, w=28, h=28, stroke-width=2.5 (half = 1.25)
  const inInnerBox = vx >= 3.25 && vx <= 28.75 && vy >= 3.25 && vy <= 28.75;
  if (inInnerBox) {
    return PRIMARY;
  }

  const inOuterStroke = vx >= 0.75 && vx <= 31.25 && vy >= 0.75 && vy <= 31.25;
  if (inOuterStroke) {
    return INK;
  }

  return WHITE;
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  const invSamplesSq = 1 / (samples * samples);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const vx = ((x + (sx + 0.5) / samples) / size) * 32;
          const vy = ((y + (sy + 0.5) / samples) / size) * 32;
          const [sr, sg, sb, sa] = sampleIconPixel(vx, vy);
          r += sr;
          g += sg;
          b += sb;
          a += sa;
        }
      }

      const idx = (y * size + x) * 4;
      rgba[idx] = Math.round(r * invSamplesSq);
      rgba[idx + 1] = Math.round(g * invSamplesSq);
      rgba[idx + 2] = Math.round(b * invSamplesSq);
      rgba[idx + 3] = Math.round(a * invSamplesSq);
    }
  }

  return encodePng(size, size, rgba);
}

for (const size of [192, 512]) {
  const outPath = resolve(rootDir, `public/icon-${size}.png`);
  writeFileSync(outPath, renderIcon(size));
  console.log(`[generate-icons] Wrote ${outPath}`);
}
