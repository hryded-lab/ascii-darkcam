import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AsciiEngine, rowsForCols, type RenderInput } from "../ascii/engine";
import { MaskField } from "../ascii/mask";
import { useCamera, type CameraStatus } from "../camera/useCamera";
import { useHandTracking, type HandStatus } from "../hands/useHandTracking";
import { useStore } from "../state/store";
import { CameraOverlay } from "./CameraOverlay";

export interface StageHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getExportInput: () => Omit<RenderInput, "mask" | "maskMode"> | null;
}

const MAX_DPR = 2;
const MAX_PIXELS = 1280 * 720;

export const AsciiStage = forwardRef<StageHandle>(function AsciiStage(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AsciiEngine | null>(null);
  const maskRef = useRef(new MaskField());
  const imgRef = useRef<HTMLImageElement | null>(null);

  const pointer = useRef({ down: false, nx: 0, ny: 0 });
  const smoothBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const source = useStore((s) => s.source);
  const uploadedImage = useStore((s) => s.uploadedImage);
  const mirror = useStore((s) => s.mirror);
  const cols = useStore((s) => s.cols);
  const adjustments = useStore((s) => s.adjustments);
  const maskMode = useStore((s) => s.maskMode);
  const brushSize = useStore((s) => s.brushSize);
  const handTracking = useStore((s) => s.handTracking);
  const facing = useStore((s) => s.facing);
  const activeFilter = useStore((s) => s.activeFilter);
  const setHandPresent = useStore((s) => s.setHandPresent);
  const handPresent = useStore((s) => s.handPresent);
  const setUploadedImage = useStore((s) => s.setUploadedImage);

  const camActive = source === "camera";
  const camera = useCamera(camActive, facing);
  const preloadHands = handTracking && camActive;
  const wantHands = preloadHands && maskMode !== "full";
  const hands = useHandTracking(preloadHands);

  imgRef.current = uploadedImage;

  if (!engineRef.current) engineRef.current = new AsciiEngine();

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getExportInput: () => {
      const src = currentSource();
      if (!src) return null;
      return {
        source: src.el,
        sourceW: src.w,
        sourceH: src.h,
        cols,
        filter: activeFilter(),
        adjustments,
        mirror,
        time: performance.now() / 1000,
      };
    },
  }));

  function currentSource(): { el: CanvasImageSource; w: number; h: number } | null {
    if (source === "image" && imgRef.current && imgRef.current.complete) {
      return { el: imgRef.current, w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight };
    }
    const v = camera.videoRef.current;
    if (v && v.videoWidth > 0) return { el: v, w: v.videoWidth, h: v.videoHeight };
    return null;
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("test")) {
      const img = makeTestImage();
      img.onload = () => setUploadedImage(img);
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      const container = containerRef.current;
      if (!canvas || !engine || !container) return;
      const src = currentSource();
      if (!src) return;

      const aspect = src.h / src.w;
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      let cssW = cW;
      let cssH = cssW * aspect;
      if (cssH > cH) {
        cssH = cH;
        cssW = cssH / aspect;
      }
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      let outW = Math.round(cssW * dpr);
      let outH = Math.round(cssH * dpr);
      const total = outW * outH;
      if (total > MAX_PIXELS) {
        const k = Math.sqrt(MAX_PIXELS / total);
        outW = Math.round(outW * k);
        outH = Math.round(outH * k);
      }
      if (canvas.width !== outW || canvas.height !== outH) {
        canvas.width = outW;
        canvas.height = outH;
      }
      canvas.style.width = `${Math.round(cssW)}px`;
      canvas.style.height = `${Math.round(cssH)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rows = rowsForCols(cols, src.w, src.h);
      const mask = maskRef.current;

      if (maskMode !== "full") {
        mask.resize(cols, rows);
        let usedFrame = false;

        if (wantHands) {
          const v = camera.videoRef.current;
          const hf = v ? hands.detect(v, performance.now()) : null;
          setHandPresent(!!hf?.present);
          if (hf?.present && hf.box) {
            let x0 = hf.box.x0;
            let x1 = hf.box.x1;
            if (mirror) {
              x0 = 1 - hf.box.x1;
              x1 = 1 - hf.box.x0;
            }
            const target = { x0, y0: hf.box.y0, x1, y1: hf.box.y1 };
            const prev = smoothBox.current;
            const k = 0.4;
            smoothBox.current = prev
              ? {
                  x0: prev.x0 + (target.x0 - prev.x0) * k,
                  y0: prev.y0 + (target.y0 - prev.y0) * k,
                  x1: prev.x1 + (target.x1 - prev.x1) * k,
                  y1: prev.y1 + (target.y1 - prev.y1) * k,
                }
              : target;
            const sb = smoothBox.current;
            mask.setRect(sb.x0, sb.y0, sb.x1, sb.y1, Math.max(1.5, brushSize * 0.5));
            usedFrame = true;
          }
        } else {
          setHandPresent(false);
        }

        if (!usedFrame) {
          smoothBox.current = null;
          mask.decay(0.82);
          if (pointer.current.down) {
            mask.stamp(pointer.current.nx, pointer.current.ny, brushSize, 0.9);
          }
        }
      }

      engine.render(ctx, outW, outH, {
        source: src.el,
        sourceW: src.w,
        sourceH: src.h,
        cols,
        filter: activeFilter(),
        adjustments,
        mirror,
        mask: maskMode === "full" ? null : mask.data,
        maskMode,
        time: performance.now() / 1000,
      });

      if (maskMode !== "full" && smoothBox.current) {
        const sb = smoothBox.current;
        ctx.save();
        ctx.strokeStyle = "#ff4a1c";
        ctx.lineWidth = Math.max(2, outW * 0.0035);
        ctx.setLineDash([outW * 0.018, outW * 0.012]);
        ctx.strokeRect(
          sb.x0 * outW,
          sb.y0 * outH,
          (sb.x1 - sb.x0) * outW,
          (sb.y1 - sb.y0) * outH,
        );
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cols, adjustments, maskMode, brushSize, mirror, handTracking, source, wantHands]);

  function toLocal(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    pointer.current.nx = (e.clientX - rect.left) / rect.width;
    pointer.current.ny = (e.clientY - rect.top) / rect.height;
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center">
      <video ref={camera.videoRef} playsInline muted className="hidden" />
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full touch-none"
        style={{ cursor: maskMode === "full" ? "default" : "crosshair" }}
        onPointerDown={(e) => {
          if (maskMode === "full") return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          pointer.current.down = true;
          toLocal(e);
        }}
        onPointerMove={(e) => {
          if (pointer.current.down) toLocal(e);
        }}
        onPointerUp={() => (pointer.current.down = false)}
        onPointerCancel={() => (pointer.current.down = false)}
      />
      {camActive && (
        <CameraOverlay
          status={camera.status as CameraStatus}
          error={camera.error}
          onRetry={camera.retry}
          handStatus={wantHands ? (hands.status as HandStatus) : "idle"}
        />
      )}

      {wantHands && camera.status === "ready" && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90%] border border-paper/15 bg-plate/75 px-3 py-1 text-center font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm">
          {hands.status === "loading" && (
            <span className="text-paper/70">loading hand tracking (first time, ~8MB)…</span>
          )}
          {hands.status === "error" && (
            <span className="text-safelight">
              hand tracking unavailable — drag on the plate to paint instead
            </span>
          )}
          {hands.status === "ready" &&
            (handPresent ? (
              <span className="text-safelight">● frame locked</span>
            ) : (
              <span className="text-paper/60">raise both hands to frame the shot</span>
            ))}
        </div>
      )}
    </div>
  );
});

function makeTestImage(): HTMLImageElement {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 480;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 640, 0);
  grad.addColorStop(0, "#000");
  grad.addColorStop(1, "#fff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 480);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(255,255,255,${i / 14})`;
    ctx.fillRect(0, i * 60, 640, 30);
  }
  ctx.fillStyle = "#9fd";
  ctx.beginPath();
  ctx.arc(420, 240, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f39";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(40, 440);
  ctx.lineTo(360, 60);
  ctx.stroke();
  const img = new Image();
  img.src = c.toDataURL();
  return img;
}
