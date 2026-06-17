import { create } from "zustand";
import { FILTERS, CUSTOM_FILTER_BASE, type AsciiFilter } from "../ascii/filters";
import type { Adjustments, MaskMode } from "../ascii/engine";

export type Source = "camera" | "image";

interface AppState {
  source: Source;
  uploadedImage: HTMLImageElement | null;
  mirror: boolean;
  facing: "user" | "environment";

  filters: AsciiFilter[];
  activeFilterId: string;
  cols: number;
  adjustments: Adjustments;
  customRamp: string;

  maskMode: MaskMode;
  brushSize: number;
  handTracking: boolean;
  handPresent: boolean;

  showControls: boolean;

  activeFilter: () => AsciiFilter;

  setSource: (s: Source) => void;
  setUploadedImage: (img: HTMLImageElement | null) => void;
  toggleMirror: () => void;
  toggleFacing: () => void;
  setActiveFilter: (id: string) => void;
  setCols: (c: number) => void;
  setAdjustment: <K extends keyof Adjustments>(k: K, v: Adjustments[K]) => void;
  setCustomRamp: (s: string) => void;
  setMaskMode: (m: MaskMode) => void;
  setBrushSize: (n: number) => void;
  setHandTracking: (on: boolean) => void;
  setHandPresent: (on: boolean) => void;
  toggleControls: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  source: "camera",
  uploadedImage: null,
  mirror: true,
  facing: "user",

  filters: [...FILTERS, { ...CUSTOM_FILTER_BASE }],
  activeFilterId: "classic",
  cols: 150,
  adjustments: { brightness: 0, contrast: 12, invert: false, edges: false },
  customRamp: CUSTOM_FILTER_BASE.customRamp ?? " .:-=+*#%@",

  maskMode: "full",
  brushSize: 6,
  handTracking: true,
  handPresent: false,

  showControls: typeof window !== "undefined" ? window.innerWidth >= 640 : true,

  activeFilter: () => {
    const s = get();
    const f = s.filters.find((f) => f.id === s.activeFilterId) ?? s.filters[0];
    if (f.id === "custom") return { ...f, customRamp: s.customRamp };
    return f;
  },

  setSource: (source) => set({ source }),
  setUploadedImage: (uploadedImage) =>
    set({ uploadedImage, source: uploadedImage ? "image" : "camera" }),
  toggleMirror: () => set((s) => ({ mirror: !s.mirror })),
  toggleFacing: () =>
    set((s) => ({ facing: s.facing === "user" ? "environment" : "user" })),
  setActiveFilter: (activeFilterId) => set({ activeFilterId }),
  setCols: (cols) => set({ cols }),
  setAdjustment: (k, v) => set((s) => ({ adjustments: { ...s.adjustments, [k]: v } })),
  setCustomRamp: (customRamp) => set({ customRamp }),
  setMaskMode: (maskMode) => set({ maskMode }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setHandTracking: (handTracking) => set({ handTracking }),
  setHandPresent: (handPresent) => set({ handPresent }),
  toggleControls: () => set((s) => ({ showControls: !s.showControls })),
}));
