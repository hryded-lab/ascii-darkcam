import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useStore } from "../state/store";
import type { StageHandle } from "./AsciiStage";
import {
  CanvasRecorder,
  downloadBlob,
  renderHiResPng,
  renderText,
  timestampName,
} from "../capture/exporters";
import { saveShot } from "../capture/gallery";

interface Props {
  stageRef: RefObject<StageHandle>;
  onOpenGallery: () => void;
  onToast: (msg: string) => void;
  onExpose: () => void;
}

export function Toolbar({ stageRef, onOpenGallery, onToast, onExpose }: Props) {
  const source = useStore((s) => s.source);
  const setUploadedImage = useStore((s) => s.setUploadedImage);
  const setSource = useStore((s) => s.setSource);
  const toggleFacing = useStore((s) => s.toggleFacing);
  const facing = useStore((s) => s.facing);

  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<CanvasRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  async function snap() {
    const input = stageRef.current?.getExportInput();
    if (!input) return onToast("nothing on the plate yet");
    onExpose();
    setBusy(true);
    try {
      const blob = await renderHiResPng(input, 2);
      downloadBlob(blob, timestampName("png"));
      await saveShot(blob, input.filter.name);
      onToast("print saved");
    } catch {
      onToast("exposure failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    const input = stageRef.current?.getExportInput();
    if (!input) return onToast("nothing on the plate yet");
    const text = renderText(
      input.source,
      input.sourceW,
      input.sourceH,
      Math.min(input.cols, 200),
      input.filter,
      input.mirror,
    );
    try {
      await navigator.clipboard.writeText(text);
      onToast("type copied");
    } catch {
      downloadBlob(new Blob([text], { type: "text/plain" }), timestampName("txt"));
      onToast("saved .txt");
    }
  }

  function toggleRecord() {
    const canvas = stageRef.current?.getCanvas();
    if (!canvas) return;
    if (!CanvasRecorder.isSupported()) return onToast("recording unsupported here");
    if (!recording) {
      const rec = new CanvasRecorder();
      rec.start(canvas, 30);
      recorderRef.current = rec;
      setRecording(true);
      onToast("exposing reel…");
    } else {
      recorderRef.current?.stop().then((blob) => {
        downloadBlob(blob, timestampName("webm"));
        onToast("reel saved");
      });
      setRecording(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setUploadedImage(img);
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-3 border border-ink/15 bg-paper2/90 px-3 py-2 shadow-[0_14px_40px_-22px_rgba(25,20,15,0.6)] backdrop-blur-sm">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex gap-1.5">
        <Tab label={recording ? "Stop" : "Reel"} active={recording} onClick={toggleRecord} />
        <Tab label="Copy" onClick={copyText} />
      </div>

      <button
        onClick={snap}
        disabled={busy}
        title="Expose a print"
        className="group relative grid h-16 w-16 place-items-center rounded-full border border-ink/30 bg-paper transition active:scale-95 disabled:opacity-50"
      >
        <span className="absolute inset-1 rounded-full border border-ink/15" />
        <span className="h-10 w-10 rounded-full bg-ink transition-colors group-hover:bg-safelight" />
      </button>

      <div className="flex gap-1.5">
        {source === "camera" ? (
          <>
            <Tab
              label={facing === "user" ? "Front" : "Back"}
              active={facing === "environment"}
              onClick={toggleFacing}
            />
            <Tab label="Photo" onClick={() => fileRef.current?.click()} />
          </>
        ) : (
          <Tab label="Camera" onClick={() => setSource("camera")} />
        )}
        <Tab label="Prints" onClick={onOpenGallery} />
      </div>
    </div>
  );
}

function Tab({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        "min-w-[3.4rem] border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
        active
          ? "border-safelight bg-safelight text-paper2"
          : "border-line bg-paper2 text-ink-soft hover:border-ink hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
