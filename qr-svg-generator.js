/**
 * ShiftRelay High-Precision SVG QR Code Generator
 * Pure JavaScript, zero external dependencies.
 * Generates ISO/IEC 18004 compliant QR Code symbols as scalable SVGs.
 */

// Galois Field GF(256) math tables for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255];
}

function getGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP_TABLE[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function reedSolomonCompute(data, ecCount) {
  const genPoly = getGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      const leadLog = LOG_TABLE[lead];
      for (let j = 0; j < genPoly.length; j++) {
        msg[i + j] ^= EXP_TABLE[(LOG_TABLE[genPoly[j]] + leadLog) % 255];
      }
    }
  }
  return Array.from(msg.slice(data.length));
}

// Version table definitions (Version 3: 29x29, Version 4: 33x33)
const QR_CONFIGS = {
  3: { size: 29, totalBytes: 70, ecBytes: 15, dataBytes: 55, align: [6, 22] },
  4: { size: 33, totalBytes: 100, ecBytes: 20, dataBytes: 80, align: [6, 26] },
  5: { size: 37, totalBytes: 134, ecBytes: 26, dataBytes: 108, align: [6, 30] }
};

function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  let ver = 3;
  if (bytes.length > 50) ver = 4;
  if (bytes.length > 75) ver = 5;
  const cfg = QR_CONFIGS[ver];

  // 1. Bitstream packaging: Mode Indicator (8-bit Byte = 0100) + Character Count + Payload
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, 8); // Character count indicator
  for (const b of bytes) {
    pushBits(b, 8);
  }

  // Terminator
  const cap = cfg.dataBytes * 8;
  const termLen = Math.min(4, cap - bits.length);
  pushBits(0, termLen);

  // Byte align
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < cap) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data byte array
  const dataArray = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataArray.push(b);
  }

  // Calculate Reed-Solomon Error Correction Code
  const ecArray = reedSolomonCompute(dataArray, cfg.ecBytes);
  const finalCodewords = dataArray.concat(ecArray);

  // 2. Build Matrix
  const N = cfg.size;
  const matrix = Array.from({ length: N }, () => new Int8Array(N).fill(-1));

  // Finder Patterns
  function drawFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row < 0 || row >= N || col < 0 || col >= N) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[row][col] = 0; // Separator
        } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[row][col] = 1;
        } else {
          matrix[row][col] = 0;
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    if (matrix[6][i] === -1) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === -1) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Alignment Pattern
  const align = cfg.align;
  for (const r of align) {
    for (const c of align) {
      if (matrix[r][c] !== -1) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          matrix[r + dr][c + dc] = (isBorder || isCenter) ? 1 : 0;
        }
      }
    }
  }

  // Dark module
  matrix[4 * ver + 9][8] = 1;

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = 0;
    if (matrix[i][8] === -1) matrix[i][8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][N - 1 - i] === -1) matrix[8][N - 1 - i] = 0;
    if (matrix[N - 1 - i][8] === -1) matrix[N - 1 - i][8] = 0;
  }

  // 3. Fill Data modules
  const allBits = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((byte >> i) & 1);
  }

  let bitIdx = 0;
  let upward = true;
  for (let right = N - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip vertical timing line
    const rows = [];
    if (upward) {
      for (let r = N - 1; r >= 0; r--) rows.push(r);
    } else {
      for (let r = 0; r < N; r++) rows.push(r);
    }
    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (matrix[r][c] === -1) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? (bit ^ 1) : bit;
        }
      }
    }
    upward = !upward;
  }

  // 4. Format information (Level L, Mask 0 -> 0x77c4)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Top-left
  matrix[8][0] = formatBits[0];
  matrix[8][1] = formatBits[1];
  matrix[8][2] = formatBits[2];
  matrix[8][3] = formatBits[3];
  matrix[8][4] = formatBits[4];
  matrix[8][5] = formatBits[5];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  matrix[5][8] = formatBits[9];
  matrix[4][8] = formatBits[10];
  matrix[3][8] = formatBits[11];
  matrix[2][8] = formatBits[12];
  matrix[1][8] = formatBits[13];
  matrix[0][8] = formatBits[14];

  // Split around finder patterns
  for (let i = 0; i < 7; i++) {
    matrix[N - 1 - i][8] = formatBits[i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][N - 15 + i] = formatBits[i];
  }

  return matrix;
}

function generateQrSvg(text, size = 240, darkColor = '#0f172a', lightColor = '#ffffff') {
  const matrix = generateQrMatrix(text);
  const N = matrix.length;
  const padding = 3;
  const totalCells = N + padding * 2;
  const cellSize = 8;
  const totalPixels = totalCells * cellSize;

  let rects = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + padding) * cellSize;
        const y = (r + padding) * cellSize;
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${darkColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPixels} ${totalPixels}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${totalPixels}" height="${totalPixels}" fill="${lightColor}" rx="12"/>
    ${rects}
  </svg>`;
}

// Browser & Module exposure
if (typeof window !== 'undefined') {
  window.generateQrMatrix = generateQrMatrix;
  window.generateQrSvg = generateQrSvg;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateQrMatrix, generateQrSvg };
}
export { generateQrMatrix, generateQrSvg };
