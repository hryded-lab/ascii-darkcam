export class MaskField {
  cols = 0;
  rows = 0;
  data = new Float32Array(0);

  resize(cols: number, rows: number) {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    this.data = new Float32Array(cols * rows);
  }

  clear() {
    this.data.fill(0);
  }

  fill() {
    this.data.fill(1);
  }

  decay(factor: number) {
    const d = this.data;
    for (let i = 0; i < d.length; i++) d[i] *= factor;
  }

  setRect(nx0: number, ny0: number, nx1: number, ny1: number, featherCells = 2) {
    const x0 = Math.min(nx0, nx1) * this.cols;
    const x1 = Math.max(nx0, nx1) * this.cols;
    const y0 = Math.min(ny0, ny1) * this.rows;
    const y1 = Math.max(ny0, ny1) * this.rows;
    const f = Math.max(0.001, featherCells);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        const dx = Math.min(cx - x0, x1 - cx);
        const dy = Math.min(cy - y0, y1 - cy);
        const edge = Math.min(dx, dy);
        let v = edge / f + 0.5;
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        this.data[y * this.cols + x] = v;
      }
    }
  }

  stamp(nx: number, ny: number, radiusCells: number, strength: number) {
    const cx = nx * this.cols;
    const cy = ny * this.rows;
    const r = Math.max(1, radiusCells);
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.cols - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.rows - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > r2) continue;
        const falloff = 1 - Math.sqrt(dist2) / r;
        const i = y * this.cols + x;
        const v = this.data[i] + falloff * strength;
        this.data[i] = v > 1 ? 1 : v;
      }
    }
  }
}
