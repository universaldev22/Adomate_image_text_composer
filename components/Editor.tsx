// File: components/Editor.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { FabricCanvas } from "./fabric/FabricCanvas";
import { LayersPanel } from "./panels/LayersPanel";
import { RightPanel } from "./panels/RightPanel";
import { Topbar } from "./panels/Topbar";
import { HistoryIndicator } from "./panels/HistoryIndicator";
import { useEditorStore } from "@/store/editorStore";

export default function Editor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr]">
      <Topbar />
      <section className="grid grid-cols-[280px_1fr_320px] gap-4 p-4">
        <div className="rounded-2xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800">
          <LayersPanel />
        </div>
        <div className="rounded-2xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800">
          {mounted && <CanvasHost />}
        </div>
        <div className="rounded-2xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800">
          <RightPanel />
        </div>
      </section>
      <HistoryIndicator />
    </main>
  );
}

function CanvasHost() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const init = useEditorStore((s) => s.initCanvas);

  // Initialize once after mount
  useEffect(() => {
    if (ref.current) init(ref.current);
    // intentionally no deps: we only init once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative grid h-[calc(100vh-180px)] place-items-center overflow-auto">
      {/* the canvas element will be intrinsically sized; wrapper centers it */}
      <canvas ref={ref} className="mx-auto rounded-lg shadow-xl" />
    </div>
  );
}
