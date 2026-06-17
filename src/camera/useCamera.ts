import { useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "denied" | "error";

export interface CameraState {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: string | null;
  retry: () => void;
}

export function useCamera(active: boolean, facing: "user" | "environment"): CameraState {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function start() {
      setStatus("starting");
      setError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus("ready");
      } catch (err) {
        const e = err as DOMException;
        if (e.name === "NotAllowedError" || e.name === "SecurityError") {
          setStatus("denied");
          setError("Camera access was blocked. Allow it in your browser to continue.");
        } else if (e.name === "NotFoundError") {
          setStatus("error");
          setError("No camera was found on this device.");
        } else {
          setStatus("error");
          setError(e.message || "Could not start the camera.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [active, facing, nonce]);

  return {
    videoRef,
    status,
    error,
    retry: () => setNonce((n) => n + 1),
  };
}
