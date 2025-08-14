"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { fabric } from "fabric";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";

export function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const refreshLayers = useEditorStore((s) => s.refreshLayers);

  const [objs, setObjs] = useState<fabric.Object[]>([]);

  const refreshNow = () => {
    if (!canvas) return;
    // New array reference forces React re-render
    setObjs(canvas.getObjects().slice());
    refreshLayers();
  };

  useEffect(() => {
    if (!canvas) return;

    const update = () => refreshNow();

    // Keep the list in sync with all relevant changes
    canvas.on("object:added", update);
    canvas.on("object:removed", update);
    canvas.on("object:modified", update);
    canvas.on("selection:created", update);
    canvas.on("selection:updated", update);
    canvas.on("selection:cleared", update);

    // IMPORTANT: update layer labels immediately when textbox content changes
    canvas.on("text:changed", update);

    // Initial population
    update();

    return () => {
      canvas.off("object:added", update);
      canvas.off("object:removed", update);
      canvas.off("object:modified", update);
      canvas.off("selection:created", update);
      canvas.off("selection:updated", update);
      canvas.off("selection:cleared", update);
      canvas.off("text:changed", update);
    };
  }, [canvas]);

  // Display top-most first in the list
  const display = useMemo(() => objs.slice().reverse(), [objs]);
  const toRealIdx = (dispIdx: number) => objs.length - 1 - dispIdx;

  const selectAt = (dispIdx: number) => {
    if (!canvas) return;
    const realIdx = toRealIdx(dispIdx);
    const obj = canvas.getObjects()[realIdx];
    if (!obj) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  };

  const deleteAt = (dispIdx: number) => {
    if (!canvas) return;
    const realIdx = toRealIdx(dispIdx);
    const obj = canvas.getObjects()[realIdx];
    if (!obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    // history captured by object:removed
  };

  const duplicateAt = (dispIdx: number) => {
    if (!canvas) return;
    const realIdx = toRealIdx(dispIdx);
    const obj = canvas.getObjects()[realIdx] as any;
    if (!obj) return;
    obj.clone((cloned: any) => {
      cloned.set({
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      // history captured by object:added
    });
  };

  const moveAt = (dispIdx: number, dir: "up" | "down") => {
    if (!canvas) return;
    const arr = canvas.getObjects();
    const realIdx = toRealIdx(dispIdx);
    const obj = arr[realIdx];
    if (!obj) return;

    // Up = increase zIndex; Down = decrease
    const target =
      dir === "up" ? Math.min(realIdx + 1, arr.length - 1) : Math.max(realIdx - 1, 0);
    if (target === realIdx) return;

    canvas.moveTo(obj, target);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();

    // moveTo() does not emit events; synthesize so UI/history update immediately
    canvas.fire("object:modified", { target: obj });
    refreshNow();
  };

  const toggleVisibleAt = (dispIdx: number) => {
    if (!canvas) return;
    const realIdx = toRealIdx(dispIdx);
    const obj = canvas.getObjects()[realIdx] as any;
    if (!obj) return;
    obj.visible = !obj.visible;
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: obj });
    refreshNow();
  };

  const toggleLockAt = (dispIdx: number) => {
    if (!canvas) return;
    const realIdx = toRealIdx(dispIdx);
    const obj = canvas.getObjects()[realIdx] as any;
    if (!obj) return;
    const lock = !obj.locked;
    obj.locked = lock;
    obj.selectable = !lock;
    obj.evented = !lock;
    obj.hasControls = !lock;
    if (obj.type === "textbox") obj.editable = !lock;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: obj });
    refreshNow();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 px-2 text-xs uppercase tracking-wide text-zinc-400">
        Layers
      </div>
      <div className="flex-1 space-y-1 overflow-auto p-2 scrollbar-thin">
        {display.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-800 p-3 text-center text-zinc-500">
            No layers yet. Add text from the top bar.
          </div>
        )}
        {display.map((obj, dispIdx) => {
          const name =
            obj.type === "textbox"
              ? ((obj as any).text || "Text").toString().slice(0, 20)
              : obj.type;
          const isActive = canvas?.getActiveObject() === obj;

          return (
            <div
              key={dispIdx}
              className={`flex items-center justify-between rounded-lg px-2 py-1 ${
                isActive ? "bg-zinc-800/70 ring-1 ring-cyan-400" : "bg-zinc-800/50"
              }`}
            >
              <button
                title="Select layer"
                className="flex-1 truncate text-left text-sm"
                onClick={() => selectAt(dispIdx)}
              >
                {name}
              </button>
              <div className="ml-2 flex items-center gap-1">
                <button
                  title="Up (bring forward)"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveAt(dispIdx, "up");
                  }}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  title="Down (send backward)"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveAt(dispIdx, "down");
                  }}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateAt(dispIdx);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  title={(obj as any).locked ? "Unlock" : "Lock"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLockAt(dispIdx);
                  }}
                >
                  {(obj as any).locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                </button>
                <button
                  title={obj.visible ? "Hide" : "Show"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibleAt(dispIdx);
                  }}
                >
                  {obj.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAt(dispIdx);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
