interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: (v: number) => string;
}

export function Slider({ label, value, min, max, step = 1, onChange, display }: Props) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-ink">
          {display ? display(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </label>
  );
}
