// news-image-20261125 — "Sum up 25 November's world news in one image"
// Bold poster, dark navy + gold. Node stdlib only. No network, no Date,
// no randomness: every coordinate and colour is fixed, so two runs are
// byte-identical. Writes one 1024x1024 PNG to argv[2] or /output/entry.png.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette ----
const NAVY = [15, 28, 51]; // #0f1c33 background
const PANEL = [22, 38, 63]; // #16263f hero / bottom panels
const GOLD = [217, 164, 65]; // #d9a441
const GOLD_DIM = [180, 135, 55];
const WHITE = [255, 255, 255];
const STEEL = [90, 107, 133]; // #5a6b85 frames
const STEEL_DIM = [67, 88, 122];
const ORANGE = [255, 90, 42]; // #ff5a2a blast / stat line
const YELLOW = [255, 196, 66];
const GREY = [154, 167, 184]; // footer text
const DARK = [10, 20, 36]; // #0a1424 silhouettes
const DARKER = [8, 16, 30];
const SEA = [27, 74, 115];
const SEA_LINE = [90, 150, 200];
const SMOKE = [107, 118, 134];
const SMOKE_LT = [139, 150, 165];
const DRONE = [201, 210, 222]; // light grey drones, read on navy
const SCREEN = [29, 50, 80];
const RED = [176, 58, 46];
const BLUE = [46, 95, 163];

// ---- rasterizer: RGB buffer ----
const buf = new Uint8Array(W * H * 3);
function fillAll(c) {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = c[0];
    buf[i * 3 + 1] = c[1];
    buf[i * 3 + 2] = c[2];
  }
}
function setPx(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}
function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
}
function frameRect(x, y, w, h, t, c) {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function line(x0, y0, x1, y1, c) {
  // Bresenham
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function thickLine(x0, y0, x1, y1, t, c) {
  const half = Math.floor(t / 2);
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) {
      line(x0 + a, y0 + b, x1 + a, y1 + b, c);
    }
  }
}
function filledCircle(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    fillRect(cx - half, cy + y, half * 2 + 1, 1, c);
  }
}
function fillPolygon(pts, c) {
  // Scanline fill, pts = [[x,y],...]
  let minY = H;
  let maxY = -1;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(xs[k], y, xs[k + 1] - xs[k] + 1, 1, c);
    }
  }
}
function triangle(x0, y0, x1, y1, x2, y2, c) {
  fillPolygon(
    [
      [x0, y0],
      [x1, y1],
      [x2, y2],
    ],
    c
  );
}

// ---- 5x7 bitmap font (own glyphs), rows are 5-bit values, MSB = left ----
const FONT = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "%": [25, 26, 2, 4, 8, 11, 19],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "+": [0, 4, 4, 31, 4, 4, 0],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [30, 1, 1, 14, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  ":": [0, 12, 12, 0, 12, 12, 0],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "?": [14, 17, 1, 6, 4, 0, 4],
};
function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}
function drawText(s, x, y, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if ((row >> (4 - col)) & 1) {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawCentered(s, cx, y, scale, c) {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// ---- PNG encoder (own CRC32, zlib deflate level 9, filter 0, type 2) ----
const CRC_TABLE = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter 0
    Buffer.from(buf.subarray(y * W * 3, (y + 1) * W * 3)).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 (RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- drawing helpers for the poster ----
function blast(cx, cy, r, c1, c2) {
  // 8-spike starburst: spikes, outer disc, hot core
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const tipX = Math.round(cx + Math.cos(a) * r * 1.9);
    const tipY = Math.round(cy + Math.sin(a) * r * 1.9);
    const baseA = a + 0.28;
    const baseB = a - 0.28;
    triangle(
      tipX,
      tipY,
      Math.round(cx + Math.cos(baseA) * r * 0.55),
      Math.round(cy + Math.sin(baseA) * r * 0.55),
      Math.round(cx + Math.cos(baseB) * r * 0.55),
      Math.round(cy + Math.sin(baseB) * r * 0.55),
      c1
    );
  }
  filledCircle(cx, cy, r, c1);
  filledCircle(cx, cy, Math.floor(r * 0.55), c2);
}
function drone(cx, cy, s) {
  // small light-grey quadcopter, reads on navy
  fillRect(cx - 9 * s, cy - 2 * s, 18 * s, 4 * s, DRONE);
  fillRect(cx - 3 * s, cy - 4 * s, 6 * s, 3 * s, DRONE);
  thickLine(cx - 12 * s, cy - 5 * s, cx + 12 * s, cy - 5 * s, 2, DRONE);
  fillRect(cx - 15 * s, cy - 7 * s, 8 * s, 2 * s, DRONE);
  fillRect(cx + 7 * s, cy - 7 * s, 8 * s, 2 * s, DRONE);
  fillRect(cx - 2 * s, cy + 2 * s, 4 * s, 4 * s, DRONE);
}
function skylineBase(yBase) {
  // dark city blocks along the hero base, clear of the tower zone x190..330
  const blocks = [
    [40, 70, 66],
    [118, 46, 108],
    [170, 20, 58],
    [338, 54, 88],
    [400, 66, 52],
    [474, 48, 118],
    [530, 82, 72],
    [620, 52, 98],
    [680, 72, 58],
    [760, 58, 92],
    [826, 66, 62],
    [900, 76, 82],
  ];
  for (const b of blocks) {
    fillRect(b[0], yBase - b[2], b[1], b[2], DARK);
    // a few lit windows, fixed positions
    for (let wy = yBase - b[2] + 10; wy < yBase - 8; wy += 16) {
      for (let wx = b[0] + 8; wx < b[0] + b[1] - 6; wx += 14) {
        if ((wx * 7 + wy * 3) % 5 < 2) fillRect(wx, wy, 4, 5, GOLD_DIM);
      }
    }
  }
}

// ================= composition =================
fillAll(NAVY);
// gold frame inset 12, 4px
frameRect(12, 12, W - 24, H - 24, 4, GOLD);

// masthead: day named big and first
drawCentered("WEDNESDAY 25 NOVEMBER 2026", 512, 36, 3, GOLD);
fillRect(28, 46, 236, 2, GOLD);
fillRect(760, 46, 236, 2, GOLD);

// ---- hero panel ----
fillRect(28, 84, 968, 516, PANEL);
frameRect(28, 84, 968, 516, 2, STEEL);

// headline, two lines, scale 7 (y100 / y156 — clear of subhead below)
drawCentered("STRIKE ON", 512, 100, 7, WHITE);
drawCentered("RIYADH'S TALLEST TOWER", 512, 156, 7, WHITE);
// subhead + stat line
drawCentered("HOUTHIS HIT THE PIF TOWER - SECOND TIME IN A WEEK", 512, 212, 2, GOLD);
drawCentered("11 WOUNDED | TUESDAY", 512, 240, 2, ORANGE);

// illustration zone y270..560 — kept CLEAR of the text zone above
// city skyline at the base
skylineBase(560);
// tower: tall dark silhouette, centre-left; spire apex y292, below stat line
fillRect(215, 340, 90, 220, DARK);
fillRect(215, 340, 3, 220, STEEL_DIM); // left edge highlight
fillRect(225, 325, 70, 15, DARK); // stepped crown
fillRect(240, 312, 40, 13, DARK);
triangle(260, 292, 240, 312, 280, 312, DARK); // spire, apex y292
// tower windows: dim steel columns with a few gold lights
for (let wy = 352; wy < 548; wy += 18) {
  for (let wx = 228; wx <= 288; wx += 20) {
    const lit = (wx * 5 + wy * 11) % 7 < 2;
    fillRect(wx, wy, 8, 10, lit ? GOLD_DIM : STEEL_DIM);
  }
}
// blast burst near the crown, right of the tower
blast(332, 328, 16, ORANGE, YELLOW);
// smoke curling right from the blast, overlapping puffs, tops below y330
filledCircle(368, 348, 13, SMOKE);
filledCircle(392, 362, 18, SMOKE_LT);
filledCircle(416, 350, 15, SMOKE);
filledCircle(442, 370, 18, SMOKE);
filledCircle(470, 356, 13, SMOKE_LT);
filledCircle(496, 380, 14, SMOKE);
// drone, light grey, upper right of the tower
drone(430, 300, 1);
// body line
drawCentered("SAUDI-LED COALITION CALLS IT A TERRORIST ATTACK", 512, 572, 1, WHITE);

// gold divider
fillRect(28, 618, 968, 3, GOLD);

// ---- bottom row: three panels y640..940 ----
const panels = [28, 360, 692];
for (const px of panels) {
  fillRect(px, 640, 304, 300, PANEL);
  frameRect(px, 640, 304, 300, 2, STEEL);
}

// panel 1 — ship strike
drawCentered("UKRAINE", 180, 652, 1, GOLD);
drawCentered("KYIV CONFIRMS", 180, 676, 3, WHITE);
drawCentered("FINLAND SHIP", 180, 700, 3, WHITE);
drawCentered("STRIKE", 180, 724, 3, WHITE);
// sea
fillRect(36, 835, 288, 65, SEA);
// cargo ship silhouette on the sea
fillPolygon(
  [
    [70, 830],
    [292, 830],
    [272, 862],
    [90, 862],
  ],
  DARK
);
fillRect(150, 800, 62, 30, DARK); // superstructure
fillRect(222, 788, 20, 42, DARK); // funnel
fillRect(222, 788, 20, 5, GOLD); // funnel top
thickLine(120, 830, 120, 796, 2, DARK); // mast
// blast on the ship + drone above
blast(256, 796, 10, ORANGE, YELLOW);
drone(286, 768, 1);
// waves
for (const wy of [874, 888, 898]) {
  for (let wx = 48; wx < 312; wx += 24) {
    fillRect(wx, wy, 14, 2, SEA_LINE);
  }
}
drawCentered("ZELENSKIY: UKRAINE DID IT", 180, 914, 1, WHITE);

// panel 2 — Huawei convicted
drawCentered("US COURT", 512, 652, 1, GOLD);
drawCentered("HUAWEI", 512, 676, 3, WHITE);
drawCentered("CONVICTED", 512, 700, 3, WHITE);
// phone backdrop
fillRect(440, 765, 144, 130, DARK);
frameRect(440, 765, 144, 130, 2, STEEL_DIM);
fillRect(450, 775, 124, 110, SCREEN);
// gold chip on the screen
fillRect(492, 800, 40, 34, GOLD);
fillRect(500, 808, 24, 18, GOLD_DIM);
for (let px = 496; px <= 524; px += 7) {
  fillRect(px, 794, 3, 6, GOLD);
  fillRect(px, 834, 3, 6, GOLD);
}
// scales of justice, gold, over the lower screen
thickLine(512, 770, 512, 872, 3, GOLD);
thickLine(456, 786, 568, 786, 3, GOLD);
thickLine(462, 786, 452, 828, 2, GOLD);
thickLine(462, 786, 472, 828, 2, GOLD);
thickLine(562, 786, 552, 828, 2, GOLD);
thickLine(562, 786, 572, 828, 2, GOLD);
triangle(452, 828, 472, 828, 462, 844, GOLD);
triangle(552, 828, 572, 828, 562, 844, GOLD);
triangle(496, 888, 528, 888, 512, 874, GOLD);
drawCentered("GUILTY OF TRADE-SECRET THEFT", 512, 914, 1, WHITE);

// panel 3 — Medal of Freedom
drawCentered("WHITE HOUSE", 844, 652, 1, GOLD);
drawCentered("MEDAL OF", 844, 676, 3, WHITE);
drawCentered("FREEDOM", 844, 700, 3, WHITE);
// ribbon
fillPolygon(
  [
    [812, 758],
    [844, 800],
    [828, 808],
    [800, 772],
  ],
  RED
);
fillPolygon(
  [
    [876, 758],
    [844, 800],
    [860, 808],
    [888, 772],
  ],
  BLUE
);
// medal
filledCircle(844, 838, 40, GOLD);
filledCircle(844, 838, 31, YELLOW);
filledCircle(844, 838, 24, GOLD);
// five-point star on the medal
fillPolygon(
  [
    [844, 816],
    [849, 831],
    [865, 831],
    [853, 841],
    [857, 856],
    [844, 847],
    [831, 856],
    [835, 841],
    [823, 831],
    [839, 831],
  ],
  WHITE
);
drawCentered("TRUMP HONOURS GIULIANI", 844, 914, 1, WHITE);

// footer briefs
drawCentered(
  "ALSO: NATO AWACS TO POLAND | EU SANCTIONS RUSSIA | NVIDIA -7% AFTER +31% | DELL AI RECORD | CIA BREACH",
  512,
  962,
  1,
  GREY
);

// ---- write output ----
const outPath = process.argv[2] || "/output/entry.png";
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, encodePNG());
