import { MATRIX_GLYPHS, EDGE_GLYPHS, BRAILLE_BITS, BAYER4 } from "./charsets";
import { rampFor, type AsciiFilter, type Palette } from "./filters";

export type MaskMode = "full" | "reveal-ascii" | "reveal-video";

export interface Adjustments {
  brightness: number;
  contrast: number;
  invert: boolean;
  edges: boolean;
}

export interface RenderInput {
  source: CanvasImageSource;
  sourceW: number;
  sourceH: number;
  cols: number;
  filter: AsciiFilter;
  adjustments: Adjustments;
  mirror: boolean;
  mask: Float32Array | null;
  maskMode: MaskMode;
  time: number;
}

export interface GridInfo {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
}

const CHAR_ASPECT = 0.52;

export function rowsForCols(cols: number, sourceW: number, sourceH: number) {
  return Math.max(1, Math.round(((cols * sourceH) / sourceW) * CHAR_ASPECT));
}

export class AsciiEngine {
  private sampler = document.createElement("canvas");
  private sampleCtx: CanvasRenderingContext2D;
  private braille = document.createElement("canvas");
  private brailleCtx: CanvasRenderingContext2D;
  private overlay = document.createElement("canvas");
  private overlayCtx: CanvasRenderingContext2D;

  private lum = new Float32Array(0);
  private rawLum = new Float32Array(0);
  private r = new Uint8ClampedArray(0);
  private g = new Uint8ClampedArray(0);
  private b = new Uint8ClampedArray(0);
  private gx = new Float32Array(0);
  private gy = new Float32Array(0);
  private braLum = new Float32Array(0);
  private hist = new Int32Array(64);
  private gridCols = 0;
  private gridRows = 0;

  lastGrid: GridInfo = { cols: 0, rows: 0, cellW: 0, cellH: 0 };

  constructor() {
    const sc = this.sampler.getContext("2d", { willReadFrequently: true });
    const bc = this.braille.getContext("2d", { willReadFrequently: true });
    const oc = this.overlay.getContext("2d");
    if (!sc || !bc || !oc) throw new Error("2D context unavailable");
    this.sampleCtx = sc;
    this.brailleCtx = bc;
    this.overlayCtx = oc;
  }

  render(ctx: CanvasRenderingContext2D, outW: number, outH: number, input: RenderInput) {
    const { source, sourceW, sourceH, cols, filter, adjustments, mirror, mask, maskMode, time } =
      input;
    if (sourceW === 0 || sourceH === 0) return;

    const rows = rowsForCols(cols, sourceW, sourceH);
    this.ensureBuffers(cols, rows);
    this.sampleSource(source, sourceW, sourceH, cols, rows, mirror);
    this.computeLuminance(cols, rows, adjustments, filter.gamma ?? 1);
    if (filter.glyphMode === "edge" || adjustments.edges) this.computeGradient(cols, rows);

    const cellW = outW / cols;
    const cellH = outH / rows;
    this.lastGrid = { cols, rows, cellW, cellH };

    const asciiEverywhere = maskMode === "full" || maskMode === "reveal-video";
    const cellMask = asciiEverywhere ? null : mask;
    const drawCellBg = maskMode === "reveal-ascii";

    if (maskMode === "reveal-ascii") this.drawRawVideo(ctx, source, outW, outH, mirror);
    else {
      ctx.fillStyle = filter.background;
      ctx.fillRect(0, 0, outW, outH);
    }

    if (filter.glyphMode === "braille") {
      this.sampleBraille(source, sourceW, sourceH, cols, rows, mirror, adjustments, filter.gamma ?? 1);
      this.drawBraille(ctx, cols, rows, cellW, cellH, filter, cellMask, drawCellBg);
    } else {
      this.drawGlyphs(ctx, cols, rows, cellW, cellH, filter, cellMask, drawCellBg, time, adjustments.edges);
    }

    if (maskMode === "reveal-video" && mask) {
      this.compositeVideoWindow(ctx, source, outW, outH, mirror, mask, cols, rows);
    }
    if (filter.scanlines) this.drawScanlines(ctx, outW, outH, filter.scanlines);
  }

  private ensureBuffers(cols: number, rows: number) {
    if (this.gridCols === cols && this.gridRows === rows) return;
    this.sampler.width = cols;
    this.sampler.height = rows;
    this.braille.width = cols * 2;
    this.braille.height = rows * 4;
    const n = cols * rows;
    this.lum = new Float32Array(n);
    this.rawLum = new Float32Array(n);
    this.r = new Uint8ClampedArray(n);
    this.g = new Uint8ClampedArray(n);
    this.b = new Uint8ClampedArray(n);
    this.gx = new Float32Array(n);
    this.gy = new Float32Array(n);
    this.braLum = new Float32Array(cols * 2 * rows * 4);
    this.gridCols = cols;
    this.gridRows = rows;
  }

  private sampleSource(
    source: CanvasImageSource,
    sourceW: number,
    sourceH: number,
    cols: number,
    rows: number,
    mirror: boolean,
  ) {
    const ctx = this.sampleCtx;
    ctx.save();
    if (mirror) {
      ctx.translate(cols, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, 0, 0, sourceW, sourceH, 0, 0, cols, rows);
    ctx.restore();
    const data = ctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0; i < cols * rows; i++) {
      const o = i * 4;
      this.r[i] = data[o];
      this.g[i] = data[o + 1];
      this.b[i] = data[o + 2];
    }
  }

  private computeLuminance(cols: number, rows: number, adj: Adjustments, gamma: number) {
    const n = cols * rows;
    const c = (adj.contrast + 100) / 100;
    const bAdd = adj.brightness * 1.5;

    const hist = this.hist;
    hist.fill(0);
    for (let i = 0; i < n; i++) {
      let l = 0.299 * this.r[i] + 0.587 * this.g[i] + 0.114 * this.b[i];
      l = (l - 128) * c + 128 + bAdd;
      if (adj.invert) l = 255 - l;
      l = l < 0 ? 0 : l > 255 ? 255 : l;
      this.rawLum[i] = l;
      hist[(l * 63) / 255 | 0]++;
    }

    const loCut = n * 0.02;
    const hiCut = n * 0.98;
    let acc = 0;
    let loBin = 0;
    for (let b = 0; b < 64; b++) {
      acc += hist[b];
      if (acc >= loCut) { loBin = b; break; }
    }
    acc = 0;
    let hiBin = 63;
    for (let b = 0; b < 64; b++) {
      acc += hist[b];
      if (acc >= hiCut) { hiBin = b; break; }
    }
    let lo = (loBin / 63) * 255;
    let hi = (hiBin / 63) * 255;
    if (hi - lo < 24) {
      lo = 0;
      hi = 255;
    }
    const range = hi - lo || 1;

    for (let i = 0; i < n; i++) {
      let nrm = (this.rawLum[i] - lo) / range;
      nrm = nrm < 0 ? 0 : nrm > 1 ? 1 : nrm;
      this.rawLum[i] = nrm * 255;
      this.lum[i] = gamma === 1 ? nrm : Math.pow(nrm, gamma);
    }
  }

  private computeGradient(cols: number, rows: number) {
    const s = this.rawLum;
    const at = (x: number, y: number) => s[y * cols + x];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          this.gx[i] = 0;
          this.gy[i] = 0;
          continue;
        }
        this.gx[i] =
          -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
          at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
        this.gy[i] =
          -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
          at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      }
    }
  }

  private drawGlyphs(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    cellW: number,
    cellH: number,
    filter: AsciiFilter,
    mask: Float32Array | null,
    drawCellBg: boolean,
    time: number,
    sketchOverlay: boolean,
  ) {
    const ramp = rampFor(filter);
    const rampMax = ramp.length - 1;
    const fontPx = Math.max(4, cellH * 1.08);
    ctx.font = `${fontPx}px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = filter.glow ? filter.glow.blur : 0;
    if (filter.glow) ctx.shadowColor = filter.glow.color;

    const fg = parseColor(filter.fg);
    const fg2 = filter.fg2 ? parseColor(filter.fg2) : null;
    const black = { r: 0, g: 0, b: 0 };
    const isEdge = filter.glyphMode === "edge";
    const isRain = filter.glyphMode === "rain";
    const edgeThr = filter.edgeThreshold ?? 42;
    const tint = filter.cellTint ?? 0;
    const tintable = filter.colorMode === "source" || filter.colorMode === "palette";
    const monoStatic = filter.colorMode === "mono" && !filter.flicker && !isRain;
    if (monoStatic) ctx.fillStyle = filter.fg;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const a = mask ? mask[i] : 1;
        if (a <= 0.004) continue;
        const lvl = this.lum[i];

        let ch: string;
        if (isEdge) {
          const mag = Math.hypot(this.gx[i], this.gy[i]);
          if (mag < edgeThr) continue;
          ch = edgeGlyph(this.gx[i], this.gy[i]);
        } else if (isRain) {
          if (lvl < 0.1) continue;
          ch = MATRIX_GLYPHS[(x * 7 + y * 13 + Math.floor(time * 7 + x)) % MATRIX_GLYPHS.length];
        } else {
          let idx = Math.round((1 - lvl) * rampMax);
          idx = idx < 0 ? 0 : idx > rampMax ? rampMax : idx;
          ch = ramp[idx];
          if (ch === " ") continue;
        }

        if (drawCellBg) {
          ctx.globalAlpha = a;
          const sb = ctx.shadowBlur;
          ctx.shadowBlur = 0;
          ctx.fillStyle = filter.background;
          ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
          ctx.shadowBlur = sb;
        } else if (tint > 0 && tintable) {
          ctx.globalAlpha = a;
          const sb = ctx.shadowBlur;
          ctx.shadowBlur = 0;
          ctx.fillStyle = this.cellWash(filter, lvl, i, tint);
          ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
          ctx.shadowBlur = sb;
        }

        ctx.fillStyle = this.glyphColor(filter, fg, fg2, black, lvl, i, time);
        ctx.globalAlpha = a;
        ctx.fillText(ch, x * cellW + cellW / 2, y * cellH + cellH / 2);
      }
    }

    if (sketchOverlay && !isEdge) {
      ctx.fillStyle = filter.colorMode === "mono" ? filter.fg : "#ffffff";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const a = mask ? mask[i] : 1;
          if (a <= 0.004) continue;
          if (Math.hypot(this.gx[i], this.gy[i]) < 60) continue;
          ctx.globalAlpha = a * 0.9;
          ctx.fillText(edgeGlyph(this.gx[i], this.gy[i]), x * cellW + cellW / 2, y * cellH + cellH / 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private glyphColor(
    filter: AsciiFilter,
    fg: RGB,
    fg2: RGB | null,
    black: RGB,
    lvl: number,
    i: number,
    time: number,
  ): string {
    switch (filter.colorMode) {
      case "source": {
        let cr = this.r[i], cg = this.g[i], cb = this.b[i];
        const sat = filter.saturate ?? 1;
        if (sat !== 1) {
          const gray = 0.299 * cr + 0.587 * cg + 0.114 * cb;
          cr = gray + (cr - gray) * sat;
          cg = gray + (cg - gray) * sat;
          cb = gray + (cb - gray) * sat;
        }
        cr *= 1.14; cg *= 1.14; cb *= 1.14;
        if (filter.flicker) {
          const f = 0.85 + 0.15 * Math.sin(time * 8 + i);
          cr *= f; cg *= f; cb *= f;
        }
        return `rgb(${clamp255(cr)},${clamp255(cg)},${clamp255(cb)})`;
      }
      case "duotone":
        return fg2 ? mix(fg2, fg, lvl) : filter.fg;
      case "palette":
        return filter.palette ? samplePalette(filter.palette, lvl) : filter.fg;
      case "mono":
      default:
        if (filter.glyphMode === "rain") {
          const fl = filter.flicker ? 0.85 + 0.15 * Math.abs(Math.sin(time * 9 + i)) : 1;
          return mix(black, fg, Math.min(1, (0.3 + 0.7 * lvl) * fl));
        }
        if (filter.flicker) {
          const f = 0.78 + 0.22 * Math.abs(Math.sin(time * 10 + i));
          return mix(black, fg, f);
        }
        return filter.fg;
    }
  }

  private cellWash(filter: AsciiFilter, lvl: number, i: number, tint: number): string {
    let cr: number, cg: number, cb: number;
    if (filter.colorMode === "palette" && filter.palette) {
      const c = parseColorObj(samplePalette(filter.palette, lvl));
      cr = c.r; cg = c.g; cb = c.b;
    } else {
      const sat = filter.saturate ?? 1;
      cr = this.r[i]; cg = this.g[i]; cb = this.b[i];
      if (sat !== 1) {
        const gray = 0.299 * cr + 0.587 * cg + 0.114 * cb;
        cr = gray + (cr - gray) * sat;
        cg = gray + (cg - gray) * sat;
        cb = gray + (cb - gray) * sat;
      }
    }
    return `rgb(${clamp255(cr * tint)},${clamp255(cg * tint)},${clamp255(cb * tint)})`;
  }

  private sampleBraille(
    source: CanvasImageSource,
    sourceW: number,
    sourceH: number,
    cols: number,
    rows: number,
    mirror: boolean,
    adj: Adjustments,
    gamma: number,
  ) {
    const sw = cols * 2;
    const sh = rows * 4;
    const ctx = this.brailleCtx;
    ctx.save();
    if (mirror) {
      ctx.translate(sw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, 0, 0, sourceW, sourceH, 0, 0, sw, sh);
    ctx.restore();
    const data = ctx.getImageData(0, 0, sw, sh).data;
    const c = (adj.contrast + 100) / 100;
    const bAdd = adj.brightness * 1.5;
    for (let i = 0; i < sw * sh; i++) {
      const o = i * 4;
      let l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      l = (l - 128) * c + 128 + bAdd;
      if (adj.invert) l = 255 - l;
      l = l < 0 ? 0 : l > 255 ? 255 : l;
      const norm = l / 255;
      this.braLum[i] = gamma === 1 ? norm : Math.pow(norm, gamma);
    }
  }

  private drawBraille(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    cellW: number,
    cellH: number,
    filter: AsciiFilter,
    mask: Float32Array | null,
    drawCellBg: boolean,
  ) {
    const sw = cols * 2;
    const fontPx = Math.max(5, cellH * 1.15);
    ctx.font = `${fontPx}px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = filter.glow ? filter.glow.blur : 0;
    if (filter.glow) ctx.shadowColor = filter.glow.color;
    const fg = parseColor(filter.fg);
    const black = { r: 0, g: 0, b: 0 };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const a = mask ? mask[i] : 1;
        if (a <= 0.004) continue;

        let bits = 0;
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 4; dy++) {
            const sx = x * 2 + dx;
            const sy = y * 4 + dy;
            const lvl = this.braLum[sy * sw + sx];
            const t = (BAYER4[sy & 3][sx & 3] + 0.5) / 16;
            if (lvl >= t) bits |= 1 << BRAILLE_BITS[dx][dy];
          }
        }
        if (bits === 0) continue;

        if (drawCellBg) {
          ctx.globalAlpha = a;
          const sb = ctx.shadowBlur;
          ctx.shadowBlur = 0;
          ctx.fillStyle = filter.background;
          ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
          ctx.shadowBlur = sb;
        }

        ctx.fillStyle = this.glyphColor(filter, fg, null, black, this.lum[i], i, 0);
        ctx.globalAlpha = a;
        ctx.fillText(String.fromCharCode(0x2800 + bits), x * cellW + cellW / 2, y * cellH + cellH / 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private compositeVideoWindow(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    outW: number,
    outH: number,
    mirror: boolean,
    mask: Float32Array,
    cols: number,
    rows: number,
  ) {
    if (this.overlay.width !== outW || this.overlay.height !== outH) {
      this.overlay.width = outW;
      this.overlay.height = outH;
    }
    const o = this.overlayCtx;
    o.clearRect(0, 0, outW, outH);
    this.drawRawVideo(o, source, outW, outH, mirror);
    o.globalCompositeOperation = "destination-in";
    const cw = outW / cols;
    const ch = outH / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const a = mask[y * cols + x];
        if (a <= 0.004) continue;
        o.globalAlpha = a;
        o.fillStyle = "#000";
        o.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
    o.globalAlpha = 1;
    o.globalCompositeOperation = "source-over";
    ctx.drawImage(this.overlay, 0, 0);
  }

  private drawRawVideo(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    outW: number,
    outH: number,
    mirror: boolean,
  ) {
    ctx.save();
    if (mirror) {
      ctx.translate(outW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, 0, 0, outW, outH);
    ctx.restore();
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();
  }
}

type RGB = { r: number; g: number; b: number };

function parseColor(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function parseColorObj(rgb: string): RGB {
  const m = rgb.match(/\d+/g);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: +m[0], g: +m[1], b: +m[2] };
}

function mix(a: RGB, b: RGB, t: number): string {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  return `rgb(${Math.round(a.r + (b.r - a.r) * tt)},${Math.round(
    a.g + (b.g - a.g) * tt,
  )},${Math.round(a.b + (b.b - a.b) * tt)})`;
}

function samplePalette(p: Palette, t: number): string {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let k = 0; k < p.length - 1; k++) {
    const [p0, c0] = p[k];
    const [p1, c1] = p[k + 1];
    if (tt >= p0 && tt <= p1) {
      const local = (tt - p0) / (p1 - p0 || 1);
      return mix(parseColor(c0), parseColor(c1), local);
    }
  }
  return p[p.length - 1][1];
}

function edgeGlyph(gx: number, gy: number): string {
  let a = Math.atan2(gy, gx) + Math.PI / 2;
  a = ((a % Math.PI) + Math.PI) % Math.PI;
  const deg = (a * 180) / Math.PI;
  if (deg < 22.5 || deg >= 157.5) return EDGE_GLYPHS[0];
  if (deg < 67.5) return EDGE_GLYPHS[1];
  if (deg < 112.5) return EDGE_GLYPHS[2];
  return EDGE_GLYPHS[3];
}
