// File: lib/canvasUtils.ts
import { fabric } from "fabric";

/** Read a File (PNG) as a data URL. */
export async function dataUrlFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Load a PNG as the CANVAS BACKGROUND at exact native size.
 * - Resizes the canvas to match the image (no scaling)
 * - Resets viewport transform (prevents stray translation that creates gaps)
 * - Pins background at (0,0) with origin top/left
 */
export async function loadBackgroundFromDataUrl(
  canvas: fabric.Canvas,
  dataUrl: string,
  shouldApply?: () => boolean
) {
  return new Promise<void>((resolve) => {
    fabric.Image.fromURL(
      dataUrl,
      (img) => {
        if (!img) return resolve();
        if (shouldApply && !shouldApply()) return resolve();

        const w = img.width ?? 0;
        const h = img.height ?? 0;

        // 1) Canvas EXACTLY matches image dimensions
        canvas.setWidth(w);
        canvas.setHeight(h);

        // 2) Reset any prior panning/zoom to avoid gaps
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.calcOffset();

        // 3) Pin bg at (0,0) — no gaps
        canvas.setBackgroundImage(
          img,
          () => {
            canvas.discardActiveObject();
            canvas.renderAll();
            resolve();
          },
          { originX: "left", originY: "top", left: 0, top: 0 }
        );
      },
      { crossOrigin: "anonymous" }
    );
  });
}

/** Adds a default textbox and selects it. */
export function addTextbox(canvas: fabric.Canvas) {
  const textbox = new fabric.Textbox("Double-click to edit", {
    left: 100,
    top: 150,
    width: 300,
    fontFamily: "Inter",
    fontSize: 48,
    fontWeight: "700",
    fill: "#ffffff",
    opacity: 1,
    textAlign: "center",
    editable: true,
    cornerStyle: "circle",
    cornerStrokeColor: "#22d3ee",
    borderColor: "#22d3ee",
    cornerSize: 10,
  });
  canvas.add(textbox);
  canvas.setActiveObject(textbox);
  canvas.requestRenderAll();
}

/** Fully clear any background image from the canvas. */
export function clearBackground(canvas: fabric.Canvas) {
  (canvas as any).backgroundImage = undefined;
  // @ts-ignore allow null for setter
  canvas.setBackgroundImage(null, undefined);
  canvas.renderAll();
}
