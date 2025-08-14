// File: lib/canvasUtils.ts
import { fabric } from "fabric";

export async function dataUrlFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads a PNG data URL as the Canvas background, sets canvas size to the image size,
 * and anchors the background at the canvas origin (0,0). The canvas element is centered
 * by layout; this function ensures the background doesn't "jump" later.
 */
export async function loadBackgroundFromDataUrl(
  canvas: fabric.Canvas,
  dataUrl: string
) {
  return new Promise<void>((resolve) => {
    fabric.Image.fromURL(
      dataUrl,
      (img) => {
        if (!img) return resolve();
        const w = img.width ?? 0,
          h = img.height ?? 0;

        // Ensure natural pixel dimensions on the canvas
        canvas.setWidth(w);
        canvas.setHeight(h);

        // Pin background to top-left of the canvas
        canvas.setBackgroundImage(
          img,
          () => {
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
    left: canvas.getWidth() / 2 - 150,
    top: canvas.getHeight() / 2 - 30,
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
