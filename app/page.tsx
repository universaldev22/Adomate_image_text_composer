"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

export default function Page() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (!isDesktop) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold">Desktop only</h1>
          <p className="mt-2 text-zinc-400">Please open this editor on a laptop or desktop (≥1024px) for the best experience.</p>
        </div>
      </main>
    );
  }
  return <Editor/>;
}
