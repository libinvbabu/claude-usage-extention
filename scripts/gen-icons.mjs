// Generates the three extension icons as valid PNGs with no external deps.
// A Claude-orange rounded square with three "usage bars". Run: npm run icons
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/icons");

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4); // transparent
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  };
  const radius = size * 0.22;
  const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let outside = false;
      if (x < radius && y < radius) outside = dist(x, y, radius, radius) > radius;
      else if (x >= size - radius && y < radius)
        outside = dist(x, y, size - radius - 1, radius) > radius;
      else if (x < radius && y >= size - radius)
        outside = dist(x, y, radius, size - radius - 1) > radius;
      else if (x >= size - radius && y >= size - radius)
        outside = dist(x, y, size - radius - 1, size - radius - 1) > radius;
      if (!outside) set(x, y, 217, 119, 87, 255); // Claude orange #d97757
    }
  }

  const bars = [
    { y: 0.32, w: 0.58 },
    { y: 0.48, w: 0.42 },
    { y: 0.64, w: 0.3 },
  ];
  const bh = Math.max(2, Math.round(size * 0.1));
  const bx = Math.round(size * 0.22);
  for (const bar of bars) {
    const by = Math.round(size * bar.y);
    const bw = Math.max(2, Math.round(size * bar.w));
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) set(x, y, 245, 243, 237, 255); // cream
    }
  }
  return buf;
}

function toPng(size) {
  const rgba = render(size);
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, toPng(size));
  console.log(`wrote ${file}`);
}
