import { useCallback, useMemo, useRef, useState } from "react";
import { AsciiStage, type StageHandle } from "./components/AsciiStage";
import { FilterBar } from "./components/FilterBar";
import { Controls } from "./components/Controls";
import { Toolbar } from "./components/Toolbar";
import { Gallery } from "./components/Gallery";
import { useStore } from "./state/store";

export default function App() {
  const stageRef = useRef<StageHandle>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const toastTimer = useRef<number | null>(null);

  const showControls = useStore((s) => s.showControls);
  const toggleControls = useStore((s) => s.toggleControls);
  const filterName = useStore((s) => s.filters.find((f) => f.id === s.activeFilterId)?.name ?? "");
  const cols = useStore((s) => s.cols);
  const source = useStore((s) => s.source);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  const today = useMemo(
    () =>
      new Date()
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase(),
    [],
  );

  return (
    <div className="grain flex h-[100dvh] flex-col overflow-hidden">
      <header className="shrink-0 px-5 pt-4 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-3">
            <h1 className="font-serif text-4xl leading-[0.85] tracking-masthead text-ink sm:text-5xl">
              Dark<span className="text-safelight">room</span>
            </h1>
            <p className="mb-1 hidden font-mono text-[10px] uppercase leading-tight tracking-[0.18em] text-ink-soft sm:block">
              develop light
              <br />
              into type
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div className="hidden text-right font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-taupe sm:block">
              {today}
              <br />
              live plate · {source === "camera" ? "lens" : "scan"}
            </div>
            <button
              onClick={toggleControls}
              aria-label={showControls ? "Close controls" : "Open controls"}
              className="border border-ink/25 bg-paper2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft transition hover:border-ink hover:text-ink"
            >
              {showControls ? "✕ Close" : "☰ Controls"}
            </button>
          </div>
        </div>
        <div className="rule mt-3" />
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-5 pb-3 pt-4 sm:px-8">
          <div className="relative min-h-0 flex-1">
            <div className="develop absolute inset-0">
              <CropMarks />
              <div className="h-full w-full overflow-hidden bg-plate shadow-plate">
                <AsciiStage ref={stageRef} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            <span>
              fig.&nbsp;i — <span className="text-ink">{filterName}</span>
            </span>
            <span className="text-taupe">{cols} cols · live</span>
          </div>

          <div className="rise mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <FilterBar />
            </div>
            <div className="flex justify-center sm:justify-end">
              <Toolbar
                stageRef={stageRef}
                onOpenGallery={() => setGalleryOpen(true)}
                onToast={notify}
                onExpose={() => setFlash((f) => f + 1)}
              />
            </div>
          </div>
        </main>

        {showControls && (
          <div
            className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm sm:hidden"
            onClick={toggleControls}
            aria-hidden
          />
        )}

        <aside
          className={[
            "absolute right-0 top-0 z-40 h-full w-[88%] max-w-[20rem] overflow-y-auto border-l border-line bg-paper2 p-6 shadow-[-24px_0_50px_-30px_rgba(25,20,15,0.7)] transition-all duration-300",
            "sm:relative sm:z-auto sm:max-w-none sm:shrink-0 sm:bg-paper2/60 sm:shadow-none",
            showControls
              ? "translate-x-0 sm:w-[19rem]"
              : "translate-x-full sm:w-0 sm:translate-x-0 sm:overflow-hidden sm:border-l-0 sm:p-0",
          ].join(" ")}
        >
          <div className="mb-6 flex items-center justify-between sm:hidden">
            <h2 className="font-serif text-2xl text-ink">The bench</h2>
            <button
              onClick={toggleControls}
              className="border border-ink/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft"
            >
              Done
            </button>
          </div>
          <Controls />
        </aside>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-ink/15 bg-ink px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper">
          {toast}
        </div>
      )}

      {flash > 0 && (
        <div key={flash} className="expose pointer-events-none fixed inset-0 z-[65] bg-paper2" />
      )}

      <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}

function CropMarks() {
  const base = "absolute h-4 w-4 border-ink/45";
  return (
    <>
      <span className={`${base} -left-1 -top-1 border-l border-t`} />
      <span className={`${base} -right-1 -top-1 border-r border-t`} />
      <span className={`${base} -bottom-1 -left-1 border-b border-l`} />
      <span className={`${base} -bottom-1 -right-1 border-b border-r`} />
    </>
  );
}
