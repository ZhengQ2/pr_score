// Minimal, dependency-free HTML helpers for the official draw pages: entity decoding, tag stripping and
// table extraction with rowspan/colspan expanded into a rectangular grid.
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',hellip:'…',eacute:'é'};
export const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):ENTITIES[e.toLowerCase()]??m);
// Block-level tags become spaces; inline tags vanish so "<strong>60</strong><strong>5</strong>" reads "605".
const BLOCK=/<\/?(?:p|div|li|ul|ol|td|th|tr|table|h[1-6]|br|section|article|header|footer)\b[^>]*>/gi;
export const text=html=>decode(String(html).replace(BLOCK,' ').replace(/<[^>]+>/g,'')).replace(/[\s\u00a0\u2011]+/g,' ').trim();

export function tables(html){
 return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(([,body])=>{
  const grid=[],pending=[]; // pending[col] = {text, rows left} for rowspans carried into later rows
  for(const [,row] of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const out=[];let col=0;
   const fill=()=>{while(pending[col]?.left>0){out[col]=pending[col].text;pending[col].left--;col++;}};
   for(const [,attrs,cell] of row.matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)){
    fill();
    const rowspan=Number(/rowspan="?(\d+)/i.exec(attrs)?.[1]??1),colspan=Number(/colspan="?(\d+)/i.exec(attrs)?.[1]??1),value=text(cell);
    for(let c=0;c<colspan;c++){out[col]=value;if(rowspan>1)pending[col]={text:value,left:rowspan-1};col++;}
   }
   fill();
   if(out.length)grid.push(out);
  }
  return grid;
 });
}

const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
// "September 10, 2026" → "2026-09-10"; returns null when the text holds no such date.
export function isoDate(s){
 const m=/([A-Za-z]+)\.?\s+(\d{1,2})\s*,\s*(\d{4})/.exec(s??'');if(!m)return null;
 const month=MONTHS.findIndex(x=>x.startsWith(m[1].toLowerCase().slice(0,3)));
 return month<0?null:`${m[3]}-${String(month+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
}
export const firstNumber=s=>{const m=/\d[\d,]*/.exec(s??'');return m?Number(m[0].replace(/,/g,'')):null;};
