import { useStore } from "../state/store";
import type { MaskMode } from "../ascii/engine";
import { Slider } from "./Slider";

const MASK_MODES: { id: MaskMode; label: string; hint: string }[] = [
  { id: "full", label: "Whole plate", hint: "The entire frame is developed into type" },
  { id: "reveal-ascii", label: "Type window", hint: "Real photo; type fills the frame you make" },
  { id: "reveal-video", label: "Photo window", hint: "Type world; a real photo shows in your frame" },
];

export function Controls() {
  const cols = useStore((s) => s.cols);
  const setCols = useStore((s) => s.setCols);
  const adjustments = useStore((s) => s.adjustments);
  const setAdjustment = useStore((s) => s.setAdjustment);
  const maskMode = useStore((s) => s.maskMode);
  const setMaskMode = useStore((s) => s.setMaskMode);
  const brushSize = useStore((s) => s.brushSize);
  const setBrushSize = useStore((s) => s.setBrushSize);
  const handTracking = useStore((s) => s.handTracking);
  const setHandTracking = useStore((s) => s.setHandTracking);
  const handPresent = useStore((s) => s.handPresent);
  const activeId = useStore((s) => s.activeFilterId);
  const customRamp = useStore((s) => s.customRamp);
  const setCustomRamp = useStore((s) => s.setCustomRamp);

  return (
    <div className="flex flex-col gap-7">
      <Section label="Exposure" no="i">
        <div className="flex flex-col gap-4">
          <Slider label="Density" value={cols} min={40} max={260} onChange={setCols} display={(v) => `${v}`} />
          <Slider label="Brightness" value={adjustments.brightness} min={-100} max={100} onChange={(v) => setAdjustment("brightness", v)} />
          <Slider label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => setAdjustment("contrast", v)} />
          <div className="flex gap-2 pt-1">
            <Toggle on={adjustments.invert} onClick={() => setAdjustment("invert", !adjustments.invert)} label="Invert" />
            <Toggle on={adjustments.edges} onClick={() => setAdjustment("edges", !adjustments.edges)} label="Edges" />
          </div>
        </div>
      </Section>

      {activeId === "custom" && (
        <Section label="The type" no="ii">
          <input
            value={customRamp}
            onChange={(e) => setCustomRamp(e.target.value)}
            spellCheck={false}
            placeholder=" .:-=+*#%@"
            className="w-full border border-line bg-paper2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-safelight"
          />
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-taupe">
            light → dark, left to right
          </p>
        </Section>
      )}

      <Section label="The frame" no={activeId === "custom" ? "iii" : "ii"}>
        <div className="mb-3 grid grid-cols-3 gap-[3px] border border-line bg-line p-[3px]">
          {MASK_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMaskMode(m.id)}
              title={m.hint}
              className={[
                "px-2 py-2.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] transition-colors",
                maskMode === m.id ? "bg-ink text-paper" : "bg-paper2 text-ink-soft hover:bg-paper",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {maskMode !== "full" && (
          <div className="flex flex-col gap-4">
            <Slider label="Frame size" value={brushSize} min={2} max={20} onChange={setBrushSize} />
            <div className="flex items-center justify-between">
              <Toggle on={handTracking} onClick={() => setHandTracking(!handTracking)} label="Hand framing" />
              <span
                className={[
                  "font-mono text-[10px] uppercase tracking-[0.12em]",
                  handPresent ? "text-safelight" : "text-taupe",
                ].join(" ")}
              >
                {handTracking ? (handPresent ? "● framed" : "○ raise hands") : "off"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-soft">
              Frame the shot with two hands — thumbs and index fingers making a rectangle (four
              fingertips) — and the filter fills the box inside. One hand or a drag across the
              plate works too.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ label, no, children }: { label: string; no: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-safelight">{no}.</span>
        <h3 className="font-serif text-xl leading-none text-ink">{label}</h3>
      </div>
      {children}
    </section>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        "border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
        on ? "border-ink bg-ink text-paper" : "border-line bg-paper2 text-ink-soft hover:border-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
