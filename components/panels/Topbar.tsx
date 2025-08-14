"use client";
import { useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Upload, Plus, Undo, Redo, Download, RotateCcw } from 'lucide-react';
import { ensureFont } from '@/lib/fonts';

export function Topbar(){
  const inputRef = useRef<HTMLInputElement>(null);
  const loadPng = useEditorStore(s=>s.loadPng);
  const addText = useEditorStore(s=>s.addText);
  const undo = useEditorStore(s=>s.undo);
  const redo = useEditorStore(s=>s.redo);
  const reset = useEditorStore(s=>s.resetDesign);
  const canvas = useEditorStore(s=>s.canvas);

  const btn = "inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700 active:translate-y-[1px]";

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/70 px-4 py-2 backdrop-blur">
      <h1 className="mr-4 text-lg font-semibold tracking-tight">Image Text Composer</h1>
      <button className={btn} onClick={()=>inputRef.current?.click()}><Upload className="h-4 w-4"/> Upload PNG</button>
      <input ref={inputRef} type="file" accept="image/png" hidden onChange={async (e)=>{ const f=e.target.files?.[0]; if(f){ await loadPng(f); } }} />
      <button className={btn} onClick={()=>{ ensureFont('Inter','700').then(()=>addText()); }}><Plus className="h-4 w-4"/> Add Text</button>
      <div className="mx-2 h-5 w-px bg-zinc-800"/>
      <button className={btn} onClick={undo}><Undo className="h-4 w-4"/> Undo</button>
      <button className={btn} onClick={redo}><Redo className="h-4 w-4"/> Redo</button>
      <div className="mx-2 h-5 w-px bg-zinc-800"/>
      <button className={btn} onClick={async ()=>{
        if(!canvas) return;
        const prevVT = canvas.viewportTransform?.slice() as any;
        canvas.setViewportTransform([1,0,0,1,0,0]);
        const url = canvas.toDataURL({ format:'png', enableRetinaScaling: true });
        if(prevVT) canvas.setViewportTransform(prevVT);
        const a = document.createElement('a'); a.href=url; a.download='image-text-composer.png'; a.click();
      }}><Download className="h-4 w-4"/> Export PNG</button>
      <div className="mx-2 h-5 w-px bg-zinc-800"/>
      <button className={btn + " bg-red-600/20 text-red-300 hover:bg-red-600/30"} onClick={reset}><RotateCcw className="h-4 w-4"/> Reset</button>
      <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">Tip: Shift + Arrow = 10px nudge</div>
    </header>
  );
}
