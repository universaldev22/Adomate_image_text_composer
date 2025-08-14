// Client-side font loader and server-side font list.
export type GoogleFont = { family: string; variants: string[] };

export async function fetchGoogleFonts(): Promise<GoogleFont[]>{
  const res = await fetch('/api/fonts');
  if(!res.ok) throw new Error('Failed to load fonts');
  return res.json();
}

export async function ensureFont(family: string, weight: string = '400'){
  const urlFamily = family.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${urlFamily}:wght@${weight}&display=swap`;
  // Inject link if not present
  const id = `gf-${urlFamily}-${weight}`;
  if(!document.getElementById(id)){
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
  }
  // Wait for the face to be ready
  try { await (document as any).fonts.load(`${weight} 16px "${family}"`); } catch {}
}
