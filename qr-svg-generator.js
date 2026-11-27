/**
 * ShiftRelay Industrial-Grade ISO/IEC 18004 SVG QR Code Generator
 * - Error Correction Level M (15% physical damage / lamination glare recovery)
 * - Full multi-block Reed-Solomon interleaving (Versions 1 to 10, up to 213 UTF-8 bytes)
 * - Full 8-mask penalty scoring (selects the highest-scannability mask 0-7 per badge)
 * - Golay(18,6) version info blocks for Versions 7-10 & 4-module ISO quiet zone
 * - Pure JavaScript, zero external dependencies, print-ready crispEdges SVG
 */

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function getGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function reedSolomonCompute(data, ecCount) {
  const gen = getGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecCount - 1; j++) rem[j] = rem[j + 1];
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return Array.from(rem);
}

// ISO/IEC 18004 Level M (15% ECC) Tables for Versions 1–10
// blocks: [[count, dataCodewordsPerBlock], ...], ecPerBlock: RS codewords per block
const QR_M_SPECS = {
  1:  { size: 21, dataBytes: 16,  ecPerBlock: 10, blocks: [[1, 16]],          align: [] },
  2:  { size: 25, dataBytes: 28,  ecPerBlock: 16, blocks: [[1, 28]],          align: [6, 18] },
  3:  { size: 29, dataBytes: 44,  ecPerBlock: 26, blocks: [[1, 44]],          align: [6, 22] },
  4:  { size: 33, dataBytes: 64,  ecPerBlock: 18, blocks: [[2, 32]],          align: [6, 26] },
  5:  { size: 37, dataBytes: 86,  ecPerBlock: 24, blocks: [[2, 43]],          align: [6, 30] },
  6:  { size: 41, dataBytes: 108, ecPerBlock: 16, blocks: [[4, 27]],          align: [6, 34] },
  7:  { size: 45, dataBytes: 124, ecPerBlock: 18, blocks: [[4, 31]],          align: [6, 22, 38] },
  8:  { size: 49, dataBytes: 154, ecPerBlock: 22, blocks: [[2, 38], [2, 39]], align: [6, 24, 42] },
  9:  { size: 53, dataBytes: 182, ecPerBlock: 22, blocks: [[3, 36], [2, 37]], align: [6, 26, 46] },
  10: { size: 57, dataBytes: 216, ecPerBlock: 26, blocks: [[4, 43], [1, 44]], align: [6, 28, 50] }
};

// Format info 15-bit strings for Level M (00) + Mask 0..7 (pre-XORed with 101010000010010)
const FORMAT_BITS_M = [
  0x5412, // Mask 0
  0x5125, // Mask 1
  0x5e7c, // Mask 2
  0x5b4b, // Mask 3
  0x45f9, // Mask 4
  0x40ce, // Mask 5
  0x4f97, // Mask 6
  0x4aa0  // Mask 7
];

// Golay(18,6) Version info bitstrings for Versions 7..10
const VERSION_BITS = {
  7:  0x07c94,
  8:  0x085bc,
  9:  0x09a99,
  10: 0x0a4d3
};

function maskBit(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function buildCodewords(bytes, ver, spec) {
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, ver <= 9 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

  const capBits = spec.dataBytes * 8;
  pushBits(0, Math.min(4, capBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let p = 0;
  while (bits.length < capBits) {
    pushBits(padBytes[p % 2], 8);
    p++;
  }

  const data = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    data[i] = v;
  }

  // Split into RS blocks & interleave per ISO/IEC 18004 Section 8.6
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (const [count, dc] of spec.blocks) {
    for (let b = 0; b < count; b++) {
      const slice = data.subarray(offset, offset + dc);
      offset += dc;
      dataBlocks.push(slice);
      ecBlocks.push(reedSolomonCompute(slice, spec.ecPerBlock));
    }
  }

  const maxDc = Math.max(...dataBlocks.map((b) => b.length));
  const final = [];
  for (let i = 0; i < maxDc; i++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (i < dataBlocks[b].length) final.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      final.push(ecBlocks[b][i]);
    }
  }
  return final;
}

function buildFunctionTemplate(ver, spec) {
  const N = spec.size;
  const matrix = Array.from({ length: N }, () => new Int8Array(N).fill(-1));
  const isFunc = Array.from({ length: N }, () => new Uint8Array(N));

  const setFunc = (r, c, val) => {
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    matrix[r][c] = val;
    isFunc[r][c] = 1;
  };

  // Finder patterns + separators
  const drawFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        const dark = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        );
        setFunc(rr, cc, dark ? 1 : 0);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    setFunc(6, i, i % 2 === 0 ? 1 : 0);
    setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment patterns (skipping finder pattern corners)
  const align = spec.align;
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      const r = align[i];
      const c = align[j];
      const onTopLeft = r < 9 && c < 9;
      const onTopRight = r < 9 && c >= N - 8;
      const onBottomLeft = r >= N - 8 && c < 9;
      if (onTopLeft || onTopRight || onBottomLeft) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunc(r + dr, c + dc, dark ? 1 : 0);
        }
      }
    }
  }

  // Dark module
  setFunc(4 * ver + 9, 8, 1);

  // Reserve Format Info areas
  for (let i = 0; i < 9; i++) {
    if (!isFunc[8][i]) setFunc(8, i, 0);
    if (!isFunc[i][8]) setFunc(i, 8, 0);
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, N - 1 - i, 0);
    setFunc(N - 1 - i, 8, 0);
  }

  // Version Info areas (Versions >= 7)
  if (ver >= 7 && VERSION_BITS[ver]) {
    const vBits = VERSION_BITS[ver];
    for (let i = 0; i < 18; i++) {
      const bit = (vBits >> i) & 1;
      const a = Math.floor(i / 3);
      const b = N - 11 + (i % 3);
      setFunc(a, b, bit);
      setFunc(b, a, bit);
    }
  }

  return { matrix, isFunc };
}

function writeFormatInfo(matrix, mask) {
  const N = matrix.length;
  const f = FORMAT_BITS_M[mask];
  // MSB = bit 14 -> index 0
  const bitAt = (idx) => (f >> (14 - idx)) & 1;

  // Top-left copy
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[tlCoords[i][0]][tlCoords[i][1]] = bitAt(i);
  }

  // Bottom-left (bits 0..6) & Top-right (bits 7..14) copy
  for (let i = 0; i < 7; i++) matrix[N - 1 - i][8] = bitAt(i);
  for (let i = 7; i < 15; i++) matrix[8][N - 15 + i] = bitAt(i);
}

function scoreMatrixPenalty(matrix) {
  const N = matrix.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-color modules in rows/cols
  for (let r = 0; r < N; r++) {
    let runColor = matrix[r][0], runLen = 1;
    for (let c = 1; c < N; c++) {
      if (matrix[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = matrix[r][c];
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < N; c++) {
    let runColor = matrix[0][c], runLen = 1;
    for (let r = 1; r < N; r++) {
      if (matrix[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = matrix[r][c];
        runLen = 1;
      }
    }
  }

  // Rule 2: 2x2 same-color blocks
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 3: Finder-like 1:1:3:1:1 patterns
  const matchFinder = (arr, i) => (
    (arr[i] === 1 && arr[i + 1] === 0 && arr[i + 2] === 1 && arr[i + 3] === 1 && arr[i + 4] === 1 && arr[i + 5] === 0 && arr[i + 6] === 1 &&
      arr[i + 7] === 0 && arr[i + 8] === 0 && arr[i + 9] === 0 && arr[i + 10] === 0) ||
    (arr[i] === 0 && arr[i + 1] === 0 && arr[i + 2] === 0 && arr[i + 3] === 0 && arr[i + 4] === 1 && arr[i + 5] === 0 && arr[i + 6] === 1 &&
      arr[i + 7] === 1 && arr[i + 8] === 1 && arr[i + 9] === 0 && arr[i + 10] === 1)
  );
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N - 11; c++) {
      if (matchFinder(matrix[r], c)) penalty += 40;
    }
  }
  const colArr = new Int8Array(N);
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N; r++) colArr[r] = matrix[r][c];
    for (let r = 0; r <= N - 11; r++) {
      if (matchFinder(colArr, r)) penalty += 40;
    }
  }

  // Rule 4: Dark/light ratio balance
  let dark = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) if (matrix[r][c] === 1) dark++;
  }
  const pct = (dark * 100) / (N * N);
  penalty += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return penalty;
}

function generateQrMatrix(text) {
  const str = String(text ?? '');
  const bytes = new TextEncoder().encode(str);

  // Pick smallest ISO Version (1..10) at Level M that fits byte-mode overhead (2 or 3 bytes)
  let ver = 10;
  for (let v = 1; v <= 10; v++) {
    const headerBytes = v <= 9 ? 2 : 3;
    if (bytes.length + headerBytes <= QR_M_SPECS[v].dataBytes) {
      ver = v;
      break;
    }
  }
  const spec = QR_M_SPECS[ver];
  const codewords = buildCodewords(bytes, ver, spec);
  const allBits = [];
  for (let i = 0; i < codewords.length; i++) {
    for (let b = 7; b >= 0; b--) allBits.push((codewords[i] >> b) & 1);
  }

  const { matrix: base, isFunc } = buildFunctionTemplate(ver, spec);
  const N = spec.size;

  let bestMatrix = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const cand = base.map((row) => new Int8Array(row));
    let bitIdx = 0;
    let upward = true;
    for (let right = N - 1; right > 0; right -= 2) {
      if (right === 6) right--;
      for (let step = 0; step < N; step++) {
        const r = upward ? (N - 1 - step) : step;
        for (let k = 0; k < 2; k++) {
          const c = right - k;
          if (!isFunc[r][c]) {
            const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
            cand[r][c] = maskBit(mask, r, c) ? (bit ^ 1) : bit;
          }
        }
      }
      upward = !upward;
    }
    writeFormatInfo(cand, mask);
    const score = scoreMatrixPenalty(cand);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = cand;
    }
  }

  return bestMatrix;
}

function generateQrSvg(text, size = 240, darkColor = '#000000', lightColor = '#ffffff') {
  const matrix = generateQrMatrix(text);
  const N = matrix.length;
  const padding = 4; // ISO/IEC 18004 minimum 4-module quiet zone for instant mobile scanning
  const totalCells = N + padding * 2;
  const cellSize = 8;
  const totalPixels = totalCells * cellSize;

  let pathD = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + padding) * cellSize;
        const y = (r + padding) * cellSize;
        pathD += `M${x} ${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPixels} ${totalPixels}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${totalPixels}" height="${totalPixels}" fill="${lightColor}"/><path d="${pathD}" fill="${darkColor}"/></svg>`;
}

if (typeof window !== 'undefined') {
  window.generateQrMatrix = generateQrMatrix;
  window.generateQrSvg = generateQrSvg;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateQrMatrix, generateQrSvg };
}
export { generateQrMatrix, generateQrSvg };
