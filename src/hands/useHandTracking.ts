import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface HandFrame {
  present: boolean;
  hands: number;
  box: Box | null;
}

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type HandStatus = "idle" | "loading" | "ready" | "error";

export function useHandTracking(enabled: boolean) {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const [status, setStatus] = useState<HandStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastTs = useRef(-1);
  const lastCount = useRef(-1);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");
    setError(null);

    async function build(delegate: "GPU" | "CPU") {
      const vision = await FilesetResolver.forVisionTasks(WASM);
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: "VIDEO",
        numHands: 2,
      });
    }

    (async () => {
      console.info("[hands] loading MediaPipe…");
      let lm: HandLandmarker | null = null;
      try {
        lm = await build("GPU");
        console.info("[hands] ready (GPU)");
      } catch (gpuErr) {
        console.warn("[hands] GPU delegate failed, trying CPU", gpuErr);
        try {
          lm = await build("CPU");
          console.info("[hands] ready (CPU)");
        } catch (cpuErr) {
          console.error("[hands] init failed (GPU + CPU)", cpuErr);
          if (!cancelled) {
            setError(String((cpuErr as Error)?.message ?? cpuErr));
            setStatus("error");
          }
          return;
        }
      }
      if (cancelled) {
        lm?.close();
        return;
      }
      landmarkerRef.current = lm;
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [enabled]);

  function detect(video: HTMLVideoElement, tsMs: number): HandFrame | null {
    const lm = landmarkerRef.current;
    if (!lm || video.readyState < 2) return null;
    if (tsMs <= lastTs.current) tsMs = lastTs.current + 1;
    lastTs.current = tsMs;

    let res;
    try {
      res = lm.detectForVideo(video, tsMs);
    } catch {
      return null;
    }
    const hands = res.landmarks;
    const count = hands?.length ?? 0;
    if (count !== lastCount.current) {
      lastCount.current = count;
      console.info(`[hands] detecting ${count} hand(s)`);
    }
    if (!hands || hands.length === 0) return { present: false, hands: 0, box: null };

    let box: Box;
    if (hands.length >= 2) {
      const pts = [hands[0][4], hands[0][8], hands[1][4], hands[1][8]];
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      box = {
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys),
      };
    } else {
      const thumb = hands[0][4];
      const index = hands[0][8];
      box = norm(thumb.x, thumb.y, index.x, index.y);
    }
    return { present: true, hands: hands.length, box };
  }

  return { detect, status, error };
}

function norm(ax: number, ay: number, bx: number, by: number): Box {
  return {
    x0: Math.min(ax, bx),
    y0: Math.min(ay, by),
    x1: Math.max(ax, bx),
    y1: Math.max(ay, by),
  };
}
