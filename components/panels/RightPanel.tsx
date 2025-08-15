// File: components/panels/RightPanel.tsx
"use client";

import { useState, useRef } from "react";
import { fabric } from "fabric";
import { useEditorStore } from "@/store/editorStore";
import { fetchGoogleFonts, ensureFont, type GoogleFont } from "@/lib/fonts";
import { rgbToHex } from "@/lib/color";
import { useEffect } from "react";

export function RightPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const active = useEditorStore((s) => s.activeObject);
  const refreshLayers = useEditorStore((s) => s.refreshLayers);

  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [, force] = useState(0);
  const commitTimer = useRef<number | null>(null);

  // Load font list
  useEffect(() => {
    let mounted = true;
    fetchGoogleFonts()
      .then((list) => mounted && setFonts(list))
      .catch(() => mounted && setFonts([]));
    return () => {
      mounted = false;
    };
  }, []);

  if (!active) {
    return (
      <div className="p-3 text-sm text-zinc-400">
        Select a text layer to edit its properties.
      </div>
    );
  }

  const isText = (active as any).type === "textbox";
  if (!isText) {
    return (
      <div className="p-3 text-sm text-zinc-400">
        Only text layers have editable properties.
      </div>
    );
  }

  const t = active as fabric.Textbox;

  const commit = (apply?: () => void) => {
    apply?.();
    t.setCoords();
    canvas?.requestRenderAll();
    refreshLayers();
    force((x) => x + 1);

    // Ask store history to capture (throttled in initCanvas through text:changed)
    canvas?.fire("text:changed", { target: t });

    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      canvas?.fire("object:modified", { target: t });
      commitTimer.current = null;
    }, 300);
  };

  const [family, weight] = [
    (t.fontFamily as string) || "Inter",
    String(t.fontWeight ?? "400"),
  ];
  const availableWeights =
    fonts.find((f) => f.family === family)?.variants ??
    ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

  return (
    <div className="space-y-3 p-2 text-sm">
      {/* Content */}
      <div>
        <label className="mb-1 block text-xs uppercase text-zinc-400">
          Content
        </label>
        <textarea
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 p-2 outline-none"
          rows={4}
          value={t.text || ""}
          onChange={(e) => commit(() => (t.text = e.target.value))}
        />
      </div>

      {/* Typography */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs uppercase text-zinc-400">
            Font
          </label>
          <select
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 outline-none"
            value={family}
            onChange={async (e) => {
              const fam = e.target.value;
              await ensureFont(fam, weight);
              commit(() => {
                t.fontFamily = fam;
              });
            }}
          >
            {fonts.map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-zinc-400">
            Weight
          </label>
          <select
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 outline-none"
            value={weight}
            onChange={async (e) => {
              const w = e.target.value;
              await ensureFont(family, w);
              commit(() => {
                t.fontWeight = w as any;
              });
            }}
          >
            {availableWeights.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <NumInput
          label="Size"
          value={t.fontSize || 18}
          min={8}
          max={512}
          step={1}
          onChange={(v) => commit(() => (t.fontSize = v))}
        />
        <NumInput
          label="Opacity"
          value={t.opacity ?? 1}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => commit(() => (t.opacity = v))}
        />
        <NumInput
          label="Line Height"
          value={t.lineHeight || 1.16}
          min={0.6}
          max={3}
          step={0.02}
          onChange={(v) => commit(() => (t.lineHeight = v))}
        />
        <NumInput
          label="Letter Spacing"
          value={(t.charSpacing || 0) / 1000}
          min={-0.1}
          max={1}
          step={0.01}
          onChange={(v) => commit(() => (t.charSpacing = Math.round(v * 1000)))}
        />
      </div>

      {/* Alignment & Color */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs uppercase text-zinc-400">
            Alignment
          </label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                className={`flex-1 rounded-md border px-2 py-1 ${
                  t.textAlign === a
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}
                onClick={() => commit(() => (t.textAlign = a))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-zinc-400">
            Color
          </label>
          <input
            type="color"
            className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 p-1"
            value={rgbToHex((t.fill as string) || "#ffffff")}
            onChange={(e) => commit(() => t.set({ fill: e.target.value }))}
          />
        </div>
      </div>

      {/* Shadow */}
      <div>
        <label className="mb-1 block text-xs uppercase text-zinc-400">
          Text Shadow
        </label>
        <div className="grid grid-cols-3 gap-2">
          <NumInput
            label="Blur"
            value={(t.shadow?.blur as number) || 0}
            min={0}
            max={50}
            step={1}
            onChange={(v) =>
              commit(
                () =>
                  (t.shadow = new fabric.Shadow({
                    color: (t.shadow?.color as string) || "#00000044",
                    blur: v,
                    offsetX: t.shadow?.offsetX || 0,
                    offsetY: t.shadow?.offsetY || 0,
                  }))
              )
            }
          />
          <NumInput
            label="X"
            value={(t.shadow?.offsetX as number) || 0}
            min={-50}
            max={50}
            step={1}
            onChange={(v) =>
              commit(
                () =>
                  (t.shadow = new fabric.Shadow({
                    color: (t.shadow?.color as string) || "#00000044",
                    blur: t.shadow?.blur || 0,
                    offsetX: v,
                    offsetY: t.shadow?.offsetY || 0,
                  }))
              )
            }
          />
          <NumInput
            label="Y"
            value={(t.shadow?.offsetY as number) || 0}
            min={-50}
            max={50}
            step={1}
            onChange={(v) =>
              commit(
                () =>
                  (t.shadow = new fabric.Shadow({
                    color: (t.shadow?.color as string) || "#00000044",
                    blur: t.shadow?.blur || 0,
                    offsetX: t.shadow?.offsetX || 0,
                    offsetY: v,
                  }))
              )
            }
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Shadow color</span>
          <input
            type="color"
            value={String(t.shadow?.color || "#00000044")}
            onChange={(e) =>
              commit(
                () =>
                  (t.shadow = new fabric.Shadow({
                    color: e.target.value,
                    blur: t.shadow?.blur || 0,
                    offsetX: t.shadow?.offsetX || 0,
                    offsetY: t.shadow?.offsetY || 0,
                  }))
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

/** small numeric input widget */
function NumInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase text-zinc-400">{label}</label>
      <input
        type="number"
        className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 outline-none"
        value={Number(Number(value).toFixed(3))}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default RightPanel;
