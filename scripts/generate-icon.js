/**
 * scripts/generate-icon.js
 *
 * Luo assets/icon.png ja assets/icon.ico ILMAN ulkoisia riippuvuuksia.
 * Windows Fluent Design -tyylinen squircle + gradientti + kirjain A.
 *
 * Aja:  node scripts/generate-icon.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// ── Matematiikka-apurit ──────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/** Pyöristetty neliö (squircle) SDF – negatiivinen arvo = sisällä */
function sdfRoundedRect(px, py, hw, hh, r) {
  const dx = Math.max(0, Math.abs(px) - hw + r);
  const dy = Math.max(0, Math.abs(py) - hh + r);
  return Math.sqrt(dx * dx + dy * dy) - r;
}

/** Kapselimuoto (pyöristetty viiva) SDF */
function sdfCapsule(px, py, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  const nx = px - (ax + t * dx);
  const ny = py - (ay + t * dy);
  return Math.sqrt(nx * nx + ny * ny) - r;
}

// ── Taustagradientin väri ────────────────────────────────────────────────────
// Diagonaalinen liukuväri: vasemmalta ylhäältä (tumma violetti) → oikealle alas (sininen)

function gradColor(px, py) {
  // t = 0 vasemmassa yläkulmassa, 1 oikeassa alakulmassa
  const t = clamp((px + py + 1.0) / 2.0, 0, 1);

  // Kolmivaiheinen gradientti:
  // 0.0 → #4A1799  (syvä violetti)
  // 0.5 → #2D45C8  (indigo-sininen)
  // 1.0 → #0E7FEA  (kirkas sininen)
  let r, g, b;
  if (t < 0.5) {
    const u = t / 0.5;
    r = Math.round(lerp(0x4A, 0x2D, u));
    g = Math.round(lerp(0x17, 0x45, u));
    b = Math.round(lerp(0x99, 0xC8, u));
  } else {
    const u = (t - 0.5) / 0.5;
    r = Math.round(lerp(0x2D, 0x0E, u));
    g = Math.round(lerp(0x45, 0x7F, u));
    b = Math.round(lerp(0xC8, 0xEA, u));
  }

  // Vasemman yläkulman kirkas heijastus (depth-efekti)
  const hl = clamp(1 - (px + 0.5 + py + 0.5) / 0.55, 0, 1) * 0.22;
  r = clamp(Math.round(r + 255 * hl), 0, 255);
  g = clamp(Math.round(g + 255 * hl), 0, 255);
  b = clamp(Math.round(b + 255 * hl), 0, 255);

  return [r, g, b];
}

// ── Symboli: A-kirjain (lihava, tasapainoinen) ───────────────────────────────

function symbolSDF(px, py) {
  // Koordinaatit normalisoitu [-0.5, +0.5] ikonin leveys = 1.0
  // A-kirjaimen geometria
  const stroke = 0.058;   // kapselin säde = puolet viivan paksuudesta

  const apexX =  0.000, apexY = -0.275;   // huippu
  const blX   = -0.290, blY  =  0.255;   // vasen jalka
  const brX   =  0.290, brY  =  0.255;   // oikea jalka

  // Poikkiviiva: 57% korkeudesta ylhäältä laskettuna
  const tCross = 0.57;
  const crossY = apexY + (blY - apexY) * tCross;        //  ≈ 0.029
  const crossLX = apexX + tCross * (blX - apexX);       //  ≈ -0.165
  const crossRX = apexX + tCross * (brX - apexX);       //  ≈  0.165

  const d1 = sdfCapsule(px, py, apexX, apexY, blX, blY, stroke);          // vasen jalka
  const d2 = sdfCapsule(px, py, apexX, apexY, brX, brY, stroke);          // oikea jalka
  const d3 = sdfCapsule(px, py, crossLX, crossY, crossRX, crossY, stroke * 0.78); // poikkiviiva

  return Math.min(d1, d2, d3);
}

// ── Pikselirenderointi ───────────────────────────────────────────────────────

function renderPixels(size) {
  const buf = new Uint8Array(size * size * 4);
  const AA  = 1.5;          // anti-alias leveys pikseleinä
  const pw  = AA / size;    // sama normalisoituina koordinaatteina

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Normalisoitu koordinaatti: 0,0 = keskipiste, ±0.5 = reunat
      const px = (x + 0.5) / size - 0.5;
      const py = (y + 0.5) / size - 0.5;

      // ── Squircle-alue ──────────────────────────────────────────────────────
      // Windows 11 -tyylinen pyöristyssäde: n. 23 %
      const cornerR = 0.228;
      const sqSdf   = sdfRoundedRect(px, py, 0.5, 0.5, cornerR);
      const sqAlpha = clamp(1 - sqSdf / pw, 0, 1);
      if (sqAlpha <= 0) { buf[i + 3] = 0; continue; }

      // ── Taustaväri ─────────────────────────────────────────────────────────
      let [r, g, b] = gradColor(px, py);

      // Hienovarainen varjostus alareunaan (syvyys)
      const shadow = clamp((py + 0.5) / 1.2, 0, 1) * 0.12;
      r = clamp(Math.round(r - 255 * shadow), 0, 255);
      g = clamp(Math.round(g - 255 * shadow), 0, 255);
      b = clamp(Math.round(b - 255 * shadow), 0, 255);

      // ── A-symboli ──────────────────────────────────────────────────────────
      const symSdf   = symbolSDF(px, py);
      const symAlpha = clamp(1 - symSdf / pw, 0, 1);

      // Valkoinen symboli sekoitetaan taustaan
      r = Math.round(lerp(r, 255, symAlpha));
      g = Math.round(lerp(g, 255, symAlpha));
      b = Math.round(lerp(b, 255, symAlpha));

      buf[i]     = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = Math.round(sqAlpha * 255);
    }
  }
  return buf;
}

/* ── PNG-pakkaus puhtaalla Node.js:llä ── */

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf  = Buffer.from(type, 'ascii');
  const lenBuf   = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf   = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(pixels, size) {
  // PNG signature
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8]  = 8;   // bit depth
  ihdr[9]  = 6;   // color type: RGBA
  ihdr[10] = 0;   // compression
  ihdr[11] = 0;   // filter
  ihdr[12] = 0;   // interlace

  // Raw pixel data with filter bytes (filter type 0 = None per row)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 4;
      const di = y * (size * 4 + 1) + 1 + x * 4;
      raw[di]   = pixels[si];
      raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2];
      raw[di+3] = pixels[si+3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── ICO-tiedoston muodostus ── */

function makeIco(pngBuffers) {
  // ICO header: ICONDIR
  const icoDirSize = 6 + pngBuffers.length * 16;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0,    0); // reserved
  header.writeUInt16LE(1,    2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = icoDirSize;
  const entries = [];
  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    // Detect size from PNG IHDR
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    entry[0] = w >= 256 ? 0 : w;   // width (0 = 256)
    entry[1] = h >= 256 ? 0 : h;   // height
    entry[2] = 0;   // color count
    entry[3] = 0;   // reserved
    entry.writeUInt16LE(1, 4);  // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8);  // size
    entry.writeUInt32LE(offset, 12); // offset
    offset += png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

/* ── BMP-tiedoston muodostus (NSIS installer-grafiikat) ── */

function makeBmp(pixels, width, height) {
  // 24-bit RGB BMP — NSIS ei tue alfa-kanavaa installer-kuvissa
  const rowBytes = width * 3;
  const rowPad   = (4 - (rowBytes % 4)) % 4;
  const rowSize  = rowBytes + rowPad;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buf = Buffer.alloc(fileSize, 0);

  // Tiedostootsikko
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);            // pikselidatan alkuosoite

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);            // otsikon koko
  buf.writeInt32LE(width,  18);
  buf.writeInt32LE(height, 22);         // positiivinen = alhaalta ylös
  buf.writeUInt16LE(1,  26);            // väritasot
  buf.writeUInt16LE(24, 28);            // bittejä pikselissä
  buf.writeUInt32LE(0,  30);            // pakkaus: none
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);           // 72 DPI X
  buf.writeInt32LE(2835, 42);           // 72 DPI Y

  // Pikselidata (alhaalta ylös, BGR)
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y;     // BMP on bottom-up
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = 54 + bmpRow * rowSize + x * 3;
      buf[dst]     = pixels[src + 2];  // B
      buf[dst + 1] = pixels[src + 1];  // G
      buf[dst + 2] = pixels[src];      // R
    }
  }
  return buf;
}

/** Apufunktio: piirtää ikonibadgen (squircle + A) koordinaatistoon lx,ly normalisoitu ±0.5 */
function blendBadge(r, g, b, lx, ly, AA, badgeSz) {
  const pw      = AA / badgeSz;
  const sqSdf   = sdfRoundedRect(lx, ly, 0.5, 0.5, 0.228);
  const sqAlpha = clamp(1 - sqSdf / pw, 0, 1);
  if (sqAlpha <= 0) return [r, g, b];

  let [br, bg, bb] = gradColor(lx, ly);
  const hl = clamp(1 - (lx + 0.5 + ly + 0.5) / 0.55, 0, 1) * 0.22;
  br = clamp(Math.round(br + 255 * hl), 0, 255);
  bg = clamp(Math.round(bg + 255 * hl), 0, 255);
  bb = clamp(Math.round(bb + 255 * hl), 0, 255);

  const symAlpha = clamp(1 - symbolSDF(lx, ly) / pw, 0, 1);
  br = Math.round(lerp(br, 255, symAlpha));
  bg = Math.round(lerp(bg, 255, symAlpha));
  bb = Math.round(lerp(bb, 255, symAlpha));

  return [
    Math.round(lerp(r, br, sqAlpha)),
    Math.round(lerp(g, bg, sqAlpha)),
    Math.round(lerp(b, bb, sqAlpha)),
  ];
}

/**
 * Installer sidebar: 164×314 px
 * NSIS MUI2 Welcome/Finish -sivun vasen paneeli.
 */
function renderSidebarPixels() {
  const W = 164, H = 314;
  const buf = new Uint8Array(W * H * 4);
  const AA  = 1.5;

  const badgeSz = 108;          // badgen koko pikseleinä
  const badgeCx = W / 2;        // 82
  const badgeCy = H * 0.285;    // ≈ 89 — yläkolmannes

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;

      // Taustagradientin globaalit normalisoitukoordinaatit
      const gx = (x + 0.5) / W - 0.5;
      const gy = (y + 0.5) / H - 0.5;

      let [r, g, b] = gradColor(gx, gy);

      // Hieno varjostus alareunan suuntaan
      const shadow = clamp((gy + 0.5) / 1.0, 0, 1) * 0.10;
      r = clamp(Math.round(r - 255 * shadow), 0, 255);
      g = clamp(Math.round(g - 255 * shadow), 0, 255);
      b = clamp(Math.round(b - 255 * shadow), 0, 255);

      // Ikonibadge
      const lx = (x - badgeCx) / badgeSz;
      const ly = (y - badgeCy) / badgeSz;
      [r, g, b] = blendBadge(r, g, b, lx, ly, AA, badgeSz);

      // Ohut valkoinen viiva badgen alla
      const lineY = badgeCy + badgeSz * 0.56;
      const ld    = Math.abs(y - lineY);
      if (ld < 1.5) {
        const la = clamp(1 - ld / 1.5, 0, 1) * 0.32;
        r = Math.round(lerp(r, 255, la));
        g = Math.round(lerp(g, 255, la));
        b = Math.round(lerp(b, 255, la));
      }

      buf[i]     = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/**
 * Installer header: 150×57 px
 * NSIS MUI2 sisäsivujen oikea yläkulma.
 */
function renderHeaderPixels() {
  const W = 150, H = 57;
  const buf = new Uint8Array(W * H * 4);
  const AA  = 1.5;

  const badgeSz = 42;
  const badgeCx = W - badgeSz / 2 - 6;   // oikeaan reunaan
  const badgeCy = H / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;

      const gx = (x + 0.5) / W - 0.5;
      const gy = (y + 0.5) / H - 0.5;

      let [r, g, b] = gradColor(gx, gy);

      // Ikonibadge
      const lx = (x - badgeCx) / badgeSz;
      const ly = (y - badgeCy) / badgeSz;
      [r, g, b] = blendBadge(r, g, b, lx, ly, AA, badgeSz);

      buf[i]     = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/* ── Pääohjelma ── */

async function run() {
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngs  = [];

  for (const sz of sizes) {
    process.stdout.write(`  Renderöidään ${sz}×${sz}… `);
    const pixels = renderPixels(sz);
    const png    = makePng(pixels, sz);
    pngs.push(png);
    process.stdout.write('✓\n');
  }

  // Tallenna 256px pääkuvakkeeksi
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), pngs[0]);
  console.log('✅ assets/icon.png luotu');

  // ICO kaikista ko'oista
  const ico = makeIco(pngs);
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), ico);
  console.log('✅ assets/icon.ico luotu');

  // Installer-grafiikat (BMP, NSIS)
  process.stdout.write('  Renderöidään installer-sidebar 164×314… ');
  fs.writeFileSync(
    path.join(ASSETS_DIR, 'installer-sidebar.bmp'),
    makeBmp(renderSidebarPixels(), 164, 314)
  );
  process.stdout.write('✓\n');

  process.stdout.write('  Renderöidään installer-header 150×57… ');
  fs.writeFileSync(
    path.join(ASSETS_DIR, 'installer-header.bmp'),
    makeBmp(renderHeaderPixels(), 150, 57)
  );
  process.stdout.write('✓\n');

  console.log('✨ Kaikki kuvakkeet generoitu!');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
