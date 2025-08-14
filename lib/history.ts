// File: lib/history.ts
import { fabric } from "fabric";

export type Snapshot = string; // JSON string

export function takeSnapshot(canvas: fabric.Canvas): Snapshot {
  // Include custom props that aren't serialized by default
  const json = canvas.toJSON(["name", "locked"]);
  return JSON.stringify(json);
}

export function restoreSnapshot(
  canvas: fabric.Canvas,
  snap: Snapshot
): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(snap, () => {
      canvas.renderAll();
      resolve();
    });
  });
}
