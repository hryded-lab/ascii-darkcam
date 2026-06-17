import type { CameraStatus } from "../camera/useCamera";
import type { HandStatus } from "../hands/useHandTracking";

interface Props {
  status: CameraStatus;
  error: string | null;
  onRetry: () => void;
  handStatus: HandStatus;
}

export function CameraOverlay({ status, error, onRetry, handStatus }: Props) {
  if (status === "ready") {
    if (handStatus === "loading") {
      return (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 border border-paper/20 bg-plate/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/70">
          loading hand framing…
        </div>
      );
    }
    return null;
  }

  return (
    <div className="absolute inset-0 grid place-items-center bg-plate/85">
      <div className="mx-6 max-w-sm border border-paper/15 bg-plate/80 p-7 text-center">
        {status === "starting" && (
          <p className="animate-pulse font-mono text-xs uppercase tracking-[0.16em] text-paper/70">
            warming the lamp…
          </p>
        )}
        {(status === "denied" || status === "error") && (
          <>
            <p className="mb-3 font-serif text-2xl text-paper">No light reaching the plate.</p>
            <p className="mb-5 text-[13px] leading-relaxed text-paper/55">
              {error ?? "Camera unavailable."} You can also load a <span className="text-safelight">Photo</span>{" "}
              instead.
            </p>
            <button
              onClick={onRetry}
              className="border border-safelight bg-safelight px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper2 transition hover:brightness-110"
            >
              Try again
            </button>
          </>
        )}
        {status === "idle" && (
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-paper/50">camera idle</p>
        )}
      </div>
    </div>
  );
}
