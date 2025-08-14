"use client";
import { useEditorStore } from '@/store/editorStore';

export function HistoryIndicator(){
  const len = useEditorStore(s=>s.history.length);
  const idx = useEditorStore(s=>s.historyIndex);
  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
      History {Math.max(0, idx+1)} / {len}
    </div>
  );
}
