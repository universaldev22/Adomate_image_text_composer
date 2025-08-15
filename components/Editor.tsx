// File: components/Editor.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { LayersPanel } from "./panels/LayersPanel";
import RightPanel from "./panels/RightPanel";
import { Topbar } from "./panels/Topbar";
import { HistoryIndicator } from "./panels/HistoryIndicator";
import { useEditorStore } from "@/store/editorStore";

export default function Editor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true)
  }, []);
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr]">
      <Topbar />

      <section className="grid grid-cols-[280px_1fr_320px] gap-4 p-4">
        <div className="rounded-2xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800">
          <LayersPanel />
        </div>

        {/* IMPORTANT: min-w-0 keeps overflow inside this column only */}
        <div className="min-w-0 rounded-2xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800">
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const init = useEditorStore((s) => s.initCanvas);

  useEffect(() => {
    if (ref.current && containerRef.current) init(ref.current, containerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-180px)] w-full overflow-auto scrollbar-thin"
    >
      {/* The canvas has the exact pixel size of the background image */}
      <canvas ref={ref} className="block rounded-lg shadow-xl" />
    </div>
  );
}
