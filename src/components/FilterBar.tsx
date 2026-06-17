import { useStore } from "../state/store";
import type { AsciiFilter } from "../ascii/filters";

function specimen(f: AsciiFilter): string {
  switch (f.id) {
    case "matrix":
      return "ｱﾐ01ﾝ";
    case "blocks":
    case "thermal":
      return "█▓▒░";
    case "braille":
      return "⣿⠿⢾⡷";
    case "contour":
      return "/│\\—";
    case "ink":
      return ".:irX";
    case "neon":
    case "color":
      return "@#*+=";
    case "custom":
      return f.customRamp?.slice(-5) || "@#*·";
    default:
      return "@%#*+";
  }
}

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const activeId = useStore((s) => s.activeFilterId);
  const setActive = useStore((s) => s.setActiveFilter);

  return (
    <div className="hide-scroll flex gap-[3px] overflow-x-auto border border-line bg-paper2/70 p-[3px] shadow-[inset_0_0_0_1px_rgba(25,20,15,0.04)]">
      {filters.map((f, i) => {
        const active = f.id === activeId;
        return (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            title={f.blurb}
            aria-label={f.name}
            aria-pressed={active}
            className={[
              "group relative flex w-[68px] shrink-0 flex-col items-center gap-1 px-2 pb-2 pt-2.5 transition-colors",
              active ? "bg-ink text-paper" : "bg-paper2 text-ink hover:bg-paper",
            ].join(" ")}
          >
            <span className="text-[11px] tabular-nums opacity-40">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={[
                "font-mono text-[15px] leading-none tracking-tight",
                active ? "text-paper" : "text-ink",
              ].join(" ")}
            >
              {specimen(f)}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
              {f.name}
            </span>
            <span
              className={[
                "absolute inset-x-2 bottom-0 h-[2px] transition-all",
                active ? "bg-safelight" : "bg-transparent group-hover:bg-line",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
