import { AsciiEngine, type RenderInput } from "../ascii/engine";
import { rampFor, type AsciiFilter } from "../ascii/filters";

export function renderHiResPng(
  input: Omit<RenderInput, "mask" | "maskMode">,
  scale = 2,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const aspect = input.sourceH / input.sourceW;
  const outW = Math.round(input.cols * 9 * scale);
  const outH = Math.round(outW * aspect);
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  const engine = new AsciiEngine();
  engine.render(ctx, outW, outH, { ...input, mask: null, maskMode: "full" });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

export function renderText(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  cols: number,
  filter: AsciiFilter,
  mirror: boolean,
): string {
  const sampler = document.createElement("canvas");
  const rows = Math.max(1, Math.round((cols * sourceH) / sourceW * 0.52));
  sampler.width = cols;
  sampler.height = rows;
  const ctx = sampler.getContext("2d", { willReadFrequently: true })!;
  ctx.save();
  if (mirror) {
    ctx.translate(cols, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, cols, rows);
  ctx.restore();
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const ramp = rampFor(filter);
  const max = ramp.length - 1;
  let out = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const o = (y * cols + x) * 4;
      const l = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255;
      out += ramp[Math.min(max, Math.max(0, Math.round((1 - l) * max)))];
    }
    out += "\n";
  }
  return out;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampName(ext: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `ascii-cam-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
}

export class CanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  static isSupported() {
    return typeof MediaRecorder !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
  }

  start(canvas: HTMLCanvasElement, fps = 30) {
    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec) return resolve(new Blob());
      rec.onstop = () => resolve(new Blob(this.chunks, { type: "video/webm" }));
      rec.stop();
      this.recorder = null;
    });
  }

  get recording() {
    return this.recorder?.state === "recording";
  }
}
