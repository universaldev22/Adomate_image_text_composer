// File: store/editorStore.ts
"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { fabric } from "fabric";
import {
  addTextbox,
  loadBackgroundFromDataUrl,
  clearBackground,
} from "@/lib/canvasUtils";
import { Snapshot, restoreSnapshot, takeSnapshot } from "@/lib/history";
import { saveToStorage, loadFromStorage, clearStorage } from "@/lib/storage";

export type LayerEntry = { id: string; name: string; visible: boolean; locked: boolean };
export type SavedDesign = { bgDataUrl: string | null; snapshot: Snapshot | null };

function applyLockFlags(o: any, locked: boolean) {
  o.locked = locked;
  o.selectable = !locked;
  o.evented = !locked;
  o.hasControls = !locked;
  if (o.type === "textbox") o.editable = !locked;
}
function sanitizeCanvas(c: fabric.Canvas) {
  c.getObjects().forEach((o: any) => applyLockFlags(o, !!o.locked));
}

interface EditorState {
  canvas: fabric.Canvas | null;
  activeObject: fabric.Object | null;
  restoreEpoch: number;
  containerCanvas: HTMLDivElement | null;

  initCanvas: (el: HTMLCanvasElement, container: HTMLDivElement) => void;

  bgDataUrl: string | null;
  loadPng: (file: File) => Promise<void>;

  addText: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;

  layers: LayerEntry[];
  refreshLayers: () => void;

  selectLayer: (index: number) => void;
  deleteLayerAt: (index: number) => void;
  duplicateLayerAt: (index: number) => void;
  toggleVisibleAt: (index: number) => void;
  toggleLockAt: (index: number) => void;
  moveLayerAt: (index: number, dir: "up" | "down") => void;

  history: Snapshot[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  autosave: () => void;
  resetDesign: () => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    canvas: null,
    activeObject: null,
    restoreEpoch: 0,
    containerCanvas: null,

    initCanvas: (el, container) => {
      set({ containerCanvas: container });
      const canvas = new fabric.Canvas(el, {
        backgroundColor: "#111827",
        preserveObjectStacking: true,
        fireRightClick: false,

        // Enable marquee selection (drag to lasso-select)
        selection: true,
        skipTargetFind: false,
        perPixelTargetFind: false,
        width: container.clientWidth - 10,
        height: container.clientHeight - 10
      });

      // Visible marquee style
      canvas.selectionColor = "rgba(34,211,238,0.18)";
      canvas.selectionBorderColor = "#22d3ee";
      canvas.selectionDashArray = [4, 3];
      canvas.selectionLineWidth = 1;

      // Snap-to-center guides
      const SNAP = 6;
      let showV = false,
        showH = false;

      canvas.on("object:moving", (e) => {
        const obj = e.target as fabric.Object | undefined;
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

      // Mirror active object into store
      const setActive = () =>
        set({ activeObject: canvas.getActiveObject() ?? null });
      canvas.on("selection:created", setActive);
      canvas.on("selection:updated", setActive);
      canvas.on("selection:cleared", () =>
        set({ activeObject: null })
      );

      // Keyboard nudges & shortcuts
      const onKey = (ev: KeyboardEvent) => {
        const target = ev.target as HTMLElement | null;
        if (
          (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) ||
          target?.isContentEditable
        ) {
          return;
        }

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

        if ((sel as any)?.isEditing) return;

        if (sel && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
          ev.preventDefault();
          const t = sel as fabric.Object;
          if (ev.code === "ArrowUp") t.top = (t.top || 0) - step;
          if (ev.code === "ArrowDown") t.top = (t.top || 0) + step;
          if (ev.code === "ArrowLeft") t.left = (t.left || 0) - step;
          if (ev.code === "ArrowRight") t.left = (t.left || 0) + step;
          t.setCoords();
          c.requestRenderAll();
          c.fire("object:modified", { target: t });
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

      // History capture
      const capture = () => get().pushHistory();
      canvas.on("object:added", capture);
      canvas.on("object:removed", capture);
      canvas.on("object:modified", capture);
      canvas.on("text:changed", () => {
        clearTimeout((capture as any)._t);
        (capture as any)._t = setTimeout(capture, 300);
      });

      set({ canvas });

      // Restore (guarded)
      (async () => {
        const epoch = get().restoreEpoch;
        const saved = loadFromStorage<SavedDesign>();

        if (saved?.bgDataUrl) {
          await loadBackgroundFromDataUrl(canvas, saved.bgDataUrl, () => get().restoreEpoch === epoch);
          if (get().restoreEpoch !== epoch) return;
          set((s) => {
            s.bgDataUrl = saved.bgDataUrl!;
          });
        }

        if (saved?.snapshot) {
          if (get().restoreEpoch !== epoch) return;
          await restoreSnapshot(canvas, saved.snapshot);
          if (get().restoreEpoch !== epoch) return;
          sanitizeCanvas(canvas);
        }

        get().refreshLayers();
        get().pushHistory(); // baseline
      })();
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
      c.fire("object:modified"); // history capture for bg change
    },

    addText() {
      const c = get().canvas!;
      addTextbox(c);
      get().refreshLayers();
    },

    deleteSelection() {
      const c = get().canvas!;
      const sel = c.getActiveObjects();
      sel.forEach((o) => c.remove(o));
      c.discardActiveObject();
      set({ activeObject: null });
      c.requestRenderAll();
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
        set({ activeObject: cloned });
        c.requestRenderAll();
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
      set({ activeObject: obj });
      c.requestRenderAll();
      get().refreshLayers();
    },

    deleteLayerAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index];
      if (!obj) return;
      if (c.getActiveObject() === obj) {
        c.discardActiveObject();
        set({ activeObject: null });
      }
      c.remove(obj);
      c.requestRenderAll();
      get().refreshLayers();
    },

    duplicateLayerAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index];
      if (!obj) return;
      (obj as any).clone((cloned: any) => {
        cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
        c.add(cloned);
        c.setActiveObject(cloned);
        set({ activeObject: cloned });
        c.requestRenderAll();
        get().refreshLayers();
      });
    },

    toggleVisibleAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index] as any;
      if (!obj) return;
      obj.visible = !obj.visible;
      c.requestRenderAll();
      c.fire("object:modified", { target: obj });
      get().refreshLayers();
    },

    toggleLockAt(index) {
      const c = get().canvas!;
      const obj = c.getObjects()[index] as any;
      if (!obj) return;
      const next = !obj.locked;
      applyLockFlags(obj, next);
      c.setActiveObject(obj);
      set({ activeObject: obj });
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
      set({ activeObject: obj });
      c.requestRenderAll();
      c.fire("object:modified", { target: obj });
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
        set({ historyIndex: idx, activeObject: c.getActiveObject() ?? null });
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
        set({ historyIndex: idx, activeObject: c.getActiveObject() ?? null });
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
      // cancel any in-flight restore
      set((s) => {
        s.restoreEpoch += 1;
      });

      c.discardActiveObject();
      c.clear();
      clearBackground(c);

      clearStorage();

      set({ bgDataUrl: null, history: [], historyIndex: -1, activeObject: null });

      get().refreshLayers();
      get().pushHistory();      
    },
  }))
);
