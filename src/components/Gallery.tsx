import { useEffect, useState } from "react";
import { deleteShot, listShots, type Shot } from "../capture/gallery";
import { downloadBlob, timestampName } from "../capture/exporters";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Gallery({ open, onClose }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);

  useEffect(() => {
    if (open) listShots().then(setShots);
  }, [open]);

  if (!open) return null;

  async function remove(id: string) {
    await deleteShot(id);
    setShots((s) => s.filter((x) => x.id !== id));
  }

  function download(shot: Shot) {
    fetch(shot.dataUrl)
      .then((r) => r.blob())
      .then((b) => downloadBlob(b, timestampName("png")));
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-line bg-paper p-6 shadow-plate"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-serif text-3xl text-ink">Contact sheet</h2>
          <button
            onClick={onClose}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft hover:text-safelight"
          >
            close ✕
          </button>
        </div>

        {shots.length === 0 ? (
          <p className="py-16 text-center font-mono text-xs uppercase tracking-[0.16em] text-taupe">
            no prints yet — expose one
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shots.map((shot, i) => (
              <figure key={shot.id} className="group">
                <div className="relative overflow-hidden border border-line bg-plate">
                  <img src={shot.dataUrl} alt={shot.filter} className="aspect-[4/3] w-full object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/80 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper/70">
                      {shot.filter}
                    </span>
                    <span className="flex gap-2">
                      <button onClick={() => download(shot)} className="text-[9px] font-semibold uppercase text-safelight">
                        save
                      </button>
                      <button onClick={() => remove(shot.id)} className="text-[9px] font-semibold uppercase text-paper/50 hover:text-paper">
                        del
                      </button>
                    </span>
                  </figcaption>
                </div>
                <p className="mt-1 font-mono text-[9px] tabular-nums text-taupe">
                  №{String(shots.length - i).padStart(3, "0")}
                </p>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
