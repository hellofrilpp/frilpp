import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = u32be(data.length);
  const crcBuf = u32be(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function hexToRgb(hex) {
  const h = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function makePixelArtF(gridSize) {
  const cells = new Set();
  const add = (x, y) => cells.add(`${x},${y}`);
  const has = (x, y) => cells.has(`${x},${y}`);

  // Chunky retro "F" in a 16x16 grid.
  for (let y = 3; y <= 12; y += 1) {
    for (let x = 3; x <= 5; x += 1) add(x, y); // vertical stroke (3 wide)
  }
  for (let y = 3; y <= 5; y += 1) {
    for (let x = 3; x <= 11; x += 1) add(x, y); // top bar
  }
  for (let y = 7; y <= 9; y += 1) {
    for (let x = 3; x <= 10; x += 1) add(x, y); // mid bar
  }

  // Scale from 16x16 base grid to requested gridSize (16 or 32).
  const scale = gridSize / 16;
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`Unsupported gridSize ${gridSize} (expected 16 or 32)`);
  }

  const base = Array.from(cells).map((key) => {
    const [x, y] = key.split(",").map((n) => Number(n));
    return { x, y };
  });

  const out = new Set();
  const outAdd = (x, y) => out.add(`${x},${y}`);
  const outHas = (x, y) => out.has(`${x},${y}`);

  for (const p of base) {
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        outAdd(p.x * scale + dx, p.y * scale + dy);
      }
    }
  }

  // Shadow: offset by 1px.
  const shadow = new Set();
  for (const k of out) {
    const [x, y] = k.split(",").map((n) => Number(n));
    shadow.add(`${x + 1},${y + 1}`);
  }

  // Highlight: top + left edges.
  const highlight = new Set();
  for (const k of out) {
    const [x, y] = k.split(",").map((n) => Number(n));
    if (!outHas(x - 1, y) || !outHas(x, y - 1)) {
      highlight.add(`${x},${y}`);
    }
  }

  return { fill: out, shadow, highlight };
}

function encodePngRgba({ width, height, rgba }) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[(stride + 1) * y] = 0; // filter type 0
    rgba.copy(raw, (stride + 1) * y + 1, stride * y, stride * (y + 1));
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeRetroFaviconPng(size) {
  const rgba = Buffer.alloc(size * size * 4);

  const bgA = hexToRgb("#0a0016");
  const bgB = hexToRgb("#2a1354");
  const border = hexToRgb("#3b1a78");

  const fill = hexToRgb("#ff4fd8");
  const shadow = hexToRgb("#5310aa");
  const highlight = hexToRgb("#7df9ff");

  const art = makePixelArtF(size);

  const setPixel = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    rgba[idx] = c.r;
    rgba[idx + 1] = c.g;
    rgba[idx + 2] = c.b;
    rgba[idx + 3] = a;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (2 * (size - 1));
      const scan = y % 2 === 0 ? 0.92 : 1.0;
      setPixel(x, y, {
        r: Math.round(mix(bgA.r, bgB.r, t) * scan),
        g: Math.round(mix(bgA.g, bgB.g, t) * scan),
        b: Math.round(mix(bgA.b, bgB.b, t) * scan),
      });
    }
  }

  for (let i = 0; i < size; i += 1) {
    setPixel(i, 0, border);
    setPixel(i, size - 1, border);
    setPixel(0, i, border);
    setPixel(size - 1, i, border);
  }

  for (const k of art.shadow) {
    const [x, y] = k.split(",").map((n) => Number(n));
    setPixel(x, y, shadow);
  }
  for (const k of art.fill) {
    const [x, y] = k.split(",").map((n) => Number(n));
    setPixel(x, y, fill);
  }
  for (const k of art.highlight) {
    const [x, y] = k.split(",").map((n) => Number(n));
    setPixel(x, y, highlight);
  }

  return encodePngRgba({ width: size, height: size, rgba });
}

function makeIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (icon)
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = header.length + dir.length;
  const images = [];

  for (let i = 0; i < count; i += 1) {
    const { size, png } = pngs[i];
    const w = size === 256 ? 0 : size;
    const h = size === 256 ? 0 : size;
    dir.writeUInt8(w, i * 16 + 0);
    dir.writeUInt8(h, i * 16 + 1);
    dir.writeUInt8(0, i * 16 + 2); // color count
    dir.writeUInt8(0, i * 16 + 3); // reserved
    dir.writeUInt16LE(1, i * 16 + 4); // planes
    dir.writeUInt16LE(32, i * 16 + 6); // bpp
    dir.writeUInt32LE(png.length, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += png.length;
    images.push(png);
  }

  return Buffer.concat([header, dir, ...images]);
}

const outArgIdx = process.argv.indexOf("--out");
const outPath = resolve(
  process.cwd(),
  outArgIdx >= 0 && process.argv[outArgIdx + 1] ? process.argv[outArgIdx + 1] : "src/app/favicon.ico",
);

const png16 = makeRetroFaviconPng(16);
const png32 = makeRetroFaviconPng(32);
const ico = makeIco([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
]);

writeFileSync(outPath, ico);
console.log(`Wrote ${outPath} (${ico.length} bytes)`);

