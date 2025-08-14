import { NextRequest, NextResponse } from 'next/server';

let cache: any[] | null = null;

export async function GET(_req: NextRequest){
  if(cache) return NextResponse.json(cache);
  const key = process.env.GOOGLE_FONTS_API_KEY;
  if(!key){
    cache = [
      { family: 'Inter', variants: ['100','200','300','400','500','600','700','800','900'] },
      { family: 'Roboto', variants: ['100','300','400','500','700','900'] },
      { family: 'Open Sans', variants: ['300','400','500','600','700','800'] },
      { family: 'Lato', variants: ['100','300','400','700','900'] },
      { family: 'Montserrat', variants: ['100','200','300','400','500','600','700','800','900'] }
    ];
    return NextResponse.json(cache);
  }
  const url = `https://www.googleapis.com/webfonts/v1/webfonts?sort=alpha&key=${key}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if(!res.ok){
    cache = [];
    return NextResponse.json(cache);
  }
  const data = await res.json() as any;
  cache = (data.items || []).map((it: any) => ({ family: it.family, variants: (it.variants||[]).filter((v:string)=>/^(\d{3})$/.test(v)) }));
  return NextResponse.json(cache);
}
