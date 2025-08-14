// File: store/editorStore.ts
"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { fabric } from "fabric";
import { addTextbox, loadBackgroundFromDataUrl } from "@/lib/canvasUtils";
import { Snapshot, restoreSnapshot, takeSnapshot } from "@/lib/history";
import { saveToStorage, loadFromStorage, clearStorage } from "@/lib/storage";

export type LayerEntry = { id: string; name: string; visible: boolean; locked: boolean };
export type SavedDesign = { bgDataUrl: string | null; snapshot: Snapshot | null };

function sanitizeObjectFlags(o: any) {
  const lock = !!o.locked;
  o.selectable = !lock;
  o.evented = !lock;
  o.hasControls = !lock;
  if (o.type === "textbox") o.editable = !lock;
}
function sanitizeCanvas(c: fabric.Canvas) {
  c.getObjects().forEach((o: any) => sanitizeObjectFlags(o));
}

interface EditorState {
  canvas: fabric.Canvas | null;
  initCanvas: (el: HTMLCanvasElement) => void;

  bgDataUrl: string | null;
  loadPng: (file: File) => Promise<void>;

  addText: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;

  layers: LayerEntry[];
  refreshLayers: () => void;

  // Layer-indexed (used by LayersPanel)
  selectLayer: (index: number) => void;
  deleteLayerAt: (index: number) => void;
  duplicateLayerAt: (index: number) => void;
  toggleVisibleAt: (index: number) => void;
  toggleLockAt: (index: number) => void;
  moveLayerAt: (index: number, dir: "up" | "down") => void;

  // History
  history: Snapshot[];
  historyIndex: number;
  pushHistory: () => void; // internal use by event capture
  undo: () => void;
  redo: () => void;

  // Autosave
  autosave: () => void;
  resetDesign: () => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    canvas: null,

    initCanvas: (el) => {
      const canvas = new fabric.Canvas(el, {
        backgroundColor: "#111827",
        preserveObjectStacking: true,
        fireRightClick: false,
        selection: true,
      });

      // Visual selection
      canvas.selectionColor = "rgba(34,211,238,0.15)";
      canvas.selectionBorderColor = "#22d3ee";
      canvas.selectionDashArray = [4, 3];

      // Snap-to-center
      const SNAP = 6;
      let showV = false,
        showH = false;
      canvas.on("object:moving", (e) => {
        const obj = e.target as fabric.Object;
        if (!obj) return;
        const cW = canvas.getWidth(),
          cH = canvas.getHeight();
        const o = obj.getCenterPoint();
        showV = Math.abs(o.x - cW / 2) < SNAP;
        showH = Math.abs(o.y - cH / 2) < SNAP;
        if (showV) obj.left = cW / 2 - obj.getScaledWidth() / 2;
        if (showH) obj.top = cH / 2 - obj.getScaledHeight() / 2;
      });
      canvas.on("mouse:up", () => {
        showV = false;
        showH = false;
        canvas.requestRenderAll();
      });
      canvas.on("after:render", () => {
        const ctx = canvas.getContext();
        if (!ctx) return;
        const w = canvas.getWidth(),
          h = canvas.getHeight();
        ctx.save();
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1;
        if (showV) {
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
          ctx.stroke();
        }
        if (showH) {
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Keyboard nudges & shortcuts
      const onKey = (ev: KeyboardEvent) => {
        if (
          ![
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Delete",
            "Backspace",
            "KeyD",
            "KeyZ",
          ].includes(ev.code)
        )
          return;
        const c = get().canvas!;
        const sel = c.getActiveObject();
        const step = ev.shiftKey ? 10 : 1;
        if (sel && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
          ev.preventDefault();
          const t = sel as fabric.Object;
          if (ev.code === "ArrowUp") t.top = (t.top || 0) - step;
          if (ev.code === "ArrowDown") t.top = (t.top || 0) + step;
          if (ev.code === "ArrowLeft") t.left = (t.left || 0) - step;
          if (ev.code === "ArrowRight") t.left = (t.left || 0) + step;
          t.setCoords();
          c.requestRenderAll();
          c.fire("object:modified", { target: t }); // ensure history capture
        }
        if ((ev.code === "Delete" || ev.code === "Backspace") && sel) {
          get().deleteSelection();
        }
        if ((ev.metaKey || ev.ctrlKey) && ev.code === "KeyD") {
          ev.preventDefault();
          get().duplicateSelection();
        }
        if ((ev.metaKey || ev.ctrlKey) && ev.code === "KeyZ") {
          ev.preventDefault();
          ev.shiftKey ? get().redo() : get().undo();
        }
      };
      window.addEventListener("keydown", onKey);

      // History capture — rely on events only (no manual pushHistory in actions)
      const capture = () => get().pushHistory();
      canvas.on("object:added", capture);
      canvas.on("object:removed", capture);
      canvas.on("object:modified", capture);
      // throttle typing noise
      canvas.on("text:changed", () => {
        clearTimeout((capture as any)._t);
        (capture as any)._t = setTimeout(capture, 300);
      });

      set((s) => {
        s.canvas = canvas;
      });

      // Attempt to restore autosave
      setTimeout(async () => {
        const saved = loadFromStorage<SavedDesign>();
        if (saved?.bgDataUrl) {
          await loadBackgroundFromDataUrl(canvas, saved.bgDataUrl);
          set((s) => {
            s.bgDataUrl = saved.bgDataUrl;
          });
        }
        if (saved?.snapshot) {
          await restoreSnapshot(canvas, saved.snapshot);
          sanitizeCanvas(canvas);
        }
        get().refreshLayers();
        get().pushHistory(); // baseline
      }, 0);
    },

    bgDataUrl: null,

    async loadPng(file) {
      const { dataUrlFromFile } = await import("@/lib/canvasUtils");
      const dataUrl = await dataUrlFromFile(file);
      const c = get().canvas!;
      await loadBackgroundFromDataUrl(c, dataUrl);
      set((s) => {
        s.bgDataUrl = dataUrl;
      });
      // object:added is not fired by background image; synthesize a modified for history
      c.fire("object:modified");
    },

    addText() {
      const c = get().canvas!;
      addTextbox(c);
      get().refreshLayers();
      // history captured by object:added
    },

    deleteSelection() {
      const c = get().canvas!;
      const sel = c.getActiveObjects();
      sel.forEach((o) => c.remove(o));
      c.discardActiveObject();
      c.requestRenderAll();
      // history captured by object:removed
      get().refreshLayers();
    },

    duplicateSelection() {
      const c = get().canvas!;
      const sel = c.getActiveObject();
      if (!sel) return;
      sel.clone((cloned: any) => {
        cloned.set({ left: (sel.left || 0) + 20, top: (sel.top || 0) + 20 });
        c.add(cloned);
        c.setActiveObject(cloned);
        c.requestRenderAll();
        // history captured by object:added
        get().refreshLayers();
      });
    },

    layers: [],
    refreshLayers() {
      const c = get().canvas!;
      const layers: LayerEntry[] = c.getObjects().map((o, i) => ({
        id: (o as any).id || String(i),
        name:
          (o as any).type === "textbox"
            ? ((o as any).text?.slice(0, 20) || "Text")
            : (o as any).type,
        visible: !!o.visible,
        locked: !!(o as any).locked,
      }));
      set((s) => {
        s.layers = layers;
      });
    },

    selectLayer(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index];
      if (!obj) return;
      c.setActiveObject(obj);
      c.requestRenderAll();
      get().refreshLayers();
    },

    deleteLayerAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index];
      if (!obj) return;
      c.remove(obj);
      c.discardActiveObject();
      c.requestRenderAll();
      get().refreshLayers();
      // captured by object:removed
    },

    duplicateLayerAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index];
      if (!obj) return;
      (obj as any).clone((cloned: any) => {
        cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
        c.add(cloned);
        c.setActiveObject(cloned);
        c.requestRenderAll();
        get().refreshLayers();
        // captured by object:added
      });
    },

    toggleVisibleAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index] as any;
      if (!obj) return;
      obj.visible = !obj.visible;
      c.requestRenderAll();
      c.fire("object:modified", { target: obj }); // ensure history capture
      get().refreshLayers();
    },

    toggleLockAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index] as any;
      if (!obj) return;
      sanitizeObjectFlags(obj);
      obj.locked = !obj.locked;
      // Re-apply flags consistent with new lock state
      sanitizeObjectFlags(obj);
      c.setActiveObject(obj);
      c.requestRenderAll();
      c.fire("object:modified", { target: obj });
      get().refreshLayers();
    },

    moveLayerAt(index, dir) {
      const c = get().canvas!;
      const objs = c.getObjects();
      const obj = objs[index];
      if (!obj) return;
      const target =
        dir === "up" ? Math.min(index + 1, objs.length - 1) : Math.max(index - 1, 0);
      if (target === index) return;
      c.moveTo(obj, target);
      c.setActiveObject(obj);
      c.requestRenderAll();
      c.fire("object:modified", { target: obj }); // moveTo doesn't emit; synthesize
      get().refreshLayers();
    },

    // History & autosave
    history: [],
    historyIndex: -1,
    pushHistory() {
      const c = get().canvas;
      if (!c) return;
      const snap = takeSnapshot(c);
      set((s) => {
        // drop "future"
        if (s.historyIndex < s.history.length - 1) {
          s.history = s.history.slice(0, s.historyIndex + 1);
        }
        s.history.push(snap);
        if (s.history.length > 50) s.history.shift();
        s.historyIndex = s.history.length - 1;
      });
      get().autosave();
    },

    undo() {
      const { history, historyIndex } = get();
      const c = get().canvas!;
      if (historyIndex <= 0) return;
      const idx = historyIndex - 1;
      restoreSnapshot(c, history[idx]).then(() => {
        sanitizeCanvas(c);
        set((s) => {
          s.historyIndex = idx;
        });
        get().refreshLayers();
      });
    },

    redo() {
      const { history, historyIndex } = get();
      const c = get().canvas!;
      if (historyIndex >= history.length - 1) return;
      const idx = historyIndex + 1;
      restoreSnapshot(c, history[idx]).then(() => {
        sanitizeCanvas(c);
        set((s) => {
          s.historyIndex = idx;
        });
        get().refreshLayers();
      });
    },

    autosave() {
      const payload: SavedDesign = {
        bgDataUrl: get().bgDataUrl,
        snapshot: get().history[get().historyIndex] || null,
      };
      saveToStorage(payload);
    },

    resetDesign() {
      const c = get().canvas!;
      // Remove everything and background, then clear autosave BEFORE pushing a baseline
      c.clear();
      c.setBackgroundImage(null, c.renderAll.bind(c));
      clearStorage();
      set((s) => {
        s.bgDataUrl = null;
        s.history = [];
        s.historyIndex = -1;
      });
      get().refreshLayers();
      // Push clean baseline so undo/redo start from a known state
      get().pushHistory();
    },
  }))
);
