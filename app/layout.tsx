// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Image Text Composer",
  description: "PNG text overlay editor - Adomate coding challenge",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 👇 This suppresses hydration warnings caused by extensions like Grammarly
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
