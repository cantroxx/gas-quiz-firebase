const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const sourcePath = process.argv[2];
const outputDir = process.argv[3];

if (!sourcePath || !outputDir) {
  console.error('Usage: node scripts/audit/crop-level-medal-candidates.js <source.png> <output-dir>');
  process.exit(1);
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const input = fs.readFileSync(sourcePath);

if (!input.subarray(0, 8).equals(signature)) {
  throw new Error('Source is not a PNG file.');
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readChunks(buffer) {
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

function unfilterScanlines(data, width, height) {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(stride * height);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = data[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = data[inputOffset + x];
      const left = x >= bytesPerPixel ? out[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? out[rowOffset - stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? out[rowOffset - stride + x - bytesPerPixel] : 0;
      let value;

      if (filter === 0) {
        value = raw;
      } else if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        value = raw + predictor;
      } else {
        throw new Error(`Unsupported PNG filter: ${filter}`);
      }

      out[rowOffset + x] = value & 0xff;
    }
    inputOffset += stride;
  }

  return out;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * stride;
    const targetOffset = y * (stride + 1);
    filtered[targetOffset] = 0;
    rgba.copy(filtered, targetOffset + 1, sourceOffset, sourceOffset + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(filtered)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function cropRgba(source, sourceWidth, left, top, width, height) {
  const out = Buffer.alloc(width * height * 4);
  const sourceStride = sourceWidth * 4;
  const targetStride = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * sourceStride) + (left * 4);
    const targetStart = y * targetStride;
    source.copy(out, targetStart, sourceStart, sourceStart + targetStride);
  }
  return out;
}

const chunks = readChunks(input);
const ihdr = chunks.find(chunk => chunk.type === 'IHDR');
if (!ihdr) throw new Error('PNG is missing IHDR.');

const width = ihdr.data.readUInt32BE(0);
const height = ihdr.data.readUInt32BE(4);
const bitDepth = ihdr.data[8];
const colorType = ihdr.data[9];
if (bitDepth !== 8 || colorType !== 6) {
  throw new Error(`Only 8-bit RGBA PNG is supported. Found bitDepth=${bitDepth}, colorType=${colorType}.`);
}

const idat = Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data));
const rgba = unfilterScanlines(zlib.inflateSync(idat), width, height);

fs.mkdirSync(outputDir, { recursive: true });

for (let row = 0; row < 10; row += 1) {
  for (let col = 0; col < 5; col += 1) {
    const index = row * 5 + col + 1;
    const left = Math.round((col * width) / 5);
    const right = Math.round(((col + 1) * width) / 5);
    const top = Math.round((row * height) / 10);
    const bottom = Math.round(((row + 1) * height) / 10);
    const cropped = cropRgba(rgba, width, left, top, right - left, bottom - top);
    const output = encodePng(right - left, bottom - top, cropped);
    const fileName = `level-${String(index).padStart(2, '0')}-v1.png`;
    fs.writeFileSync(path.join(outputDir, fileName), output);
  }
}

console.log(`Wrote 50 medal candidates to ${outputDir}`);
