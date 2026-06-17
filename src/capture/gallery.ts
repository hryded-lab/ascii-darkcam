export interface Shot {
  id: string;
  dataUrl: string;
  filter: string;
  createdAt: number;
}

const DB = "ascii-cam";
const STORE = "shots";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveShot(blob: Blob, filter: string): Promise<Shot> {
  const dataUrl = await blobToDataUrl(blob);
  const shot: Shot = { id: crypto.randomUUID(), dataUrl, filter, createdAt: Date.now() };
  try {
    const db = await open();
    await tx(db, "readwrite", (store) => store.put(shot));
    db.close();
  } catch {
  }
  return shot;
}

export async function listShots(): Promise<Shot[]> {
  try {
    const db = await open();
    const all = await tx<Shot[]>(db, "readonly", (store) => store.getAll());
    db.close();
    return (all ?? []).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteShot(id: string): Promise<void> {
  try {
    const db = await open();
    await tx(db, "readwrite", (store) => store.delete(id));
    db.close();
  } catch {
  }
}

function tx<T = unknown>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
