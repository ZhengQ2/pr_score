// Parsers for each province's official invitation page. Each takes the page HTML and returns
// {updated, rounds:[{date, label, detail, score, size}]} with ISO dates, newest first. They throw when the
// page no longer looks the way they expect, so a redesign fails loudly instead of publishing empty data.
import {tables,text,isoDate,firstNumber} from './html.mjs';

const findTable=(html,test)=>tables(html).find(g=>g.length&&test(g[0].map(h=>h.toLowerCase())));
const column=(header,pattern)=>{const i=header.findIndex(h=>pattern.test(h.toLowerCase()));if(i<0)throw new Error(`Missing column ${pattern}`);return i;};
// "Last updated: September 9, 2026", allowing tags between the label and the date.
const lastUpdated=html=>isoDate(text(/(?:last\s+)?updated:?[\s\S]{0,200}?\d{4}/i.exec(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,''))?.[0]??''));
const newestFirst=rounds=>rounds.sort((a,b)=>b.date.localeCompare(a.date));
function nonEmpty(rounds,source){if(!rounds.length)throw new Error(`${source}: no scored rounds found`);return rounds;}

export const SOURCES={
 'bc-pnp':{
  url:'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply',
  parse(html){
   const g=findTable(html,h=>h.some(x=>x.includes('ita type'))&&h.some(x=>x.includes('minimum score')));
   if(!g)throw new Error('bc-pnp: Skills Immigration table not found');
   const [h,...rows]=g,cDate=column(h,/date/),cType=column(h,/ita type/),cFactors=column(h,/selection factors/),cScore=column(h,/minimum score/),cSize=column(h,/number of invitations/);
   // Wage-based rounds have no minimum score ("N/A") and are skipped.
   const rounds=rows.map(r=>({date:isoDate(r[cDate]),label:r[cType],detail:r[cFactors]==='Points'?'':r[cFactors].replace(/\s*\*$/,''),score:/^\d+$/.test(r[cScore])?Number(r[cScore]):null,size:r[cSize]})).filter(r=>r.date&&r.score!==null);
   return {updated:lastUpdated(html),rounds:newestFirst(nonEmpty(rounds,'bc-pnp'))};
  }},
 aaip:{
  url:'https://www.alberta.ca/aaip-processing-information',
  parse(html){
   const g=findTable(html,h=>h.some(x=>x.includes('draw date'))&&h.some(x=>x.includes('minimum score')));
   if(!g)throw new Error('aaip: draw table not found');
   const [h,...rows]=g,cDate=column(h,/draw date/),cStream=column(h,/stream/),cScore=column(h,/minimum score/),cSize=column(h,/number of invitations/);
   const rounds=rows.map(r=>({date:isoDate(r[cDate]),label:r[cStream],detail:'',score:firstNumber(r[cScore]),size:r[cSize]})).filter(r=>r.date&&r.score!==null);
   return {updated:lastUpdated(html),rounds:newestFirst(nonEmpty(rounds,'aaip'))};
  }},
 mpnp:{
  url:'https://immigratemanitoba.com/draws/',
  parse(html){
   const rounds=[];
   for(const [article] of html.matchAll(/<article\b[\s\S]*?<\/article>/gi)){
    const draw=/Draw\s*#\s*(\d+)/i.exec(text(/<h2[\s\S]*?<\/h2>/i.exec(article)?.[0]??''))?.[1];
    const date=isoDate(text(/class="published"[^>]*>([\s\S]*?)</i.exec(article)?.[1]??''));
    if(!draw||!date)continue;
    // Walk the post's blocks in order. A selection heading is an <h4> or a paragraph that is only bold text
    // (both appear); the description is the latest ordinary paragraph; counts are list items.
    let heading='',detail='',size='';
    for(const [,tag,inner] of article.matchAll(/<(h4|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)){
     const t=text(inner);if(!t)continue;
     if(tag.toLowerCase()==='h4'||(/^\s*<strong>[\s\S]*<\/strong>\s*$/i.test(inner)&&!t.includes(':'))){heading=t;detail='';size='';continue;}
     if(tag.toLowerCase()==='p'){detail=t.replace(/\s*Please see note[\s\S]*$/,'');continue;}
     const count=/Letters of Advice to Apply issued:?\s*([\d,]+)/i.exec(t)?.[1];
     if(count){size=count;continue;}
     const score=/lowest-ranked candidate invited:?\s*([\d,]+)/i.exec(t)?.[1];
     if(score)rounds.push({date,label:heading,detail:`Draw #${draw}: ${detail}`,group:`${heading}|${detail}`,score:firstNumber(score),size});
    }
   }
   const all=newestFirst(nonEmpty(rounds,'mpnp'));
   return {updated:all[0].date,rounds:all};
  }},
 oinp:{
  url:'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply',
  // Only Ontario Workforce Priority rounds are comparable with the current grid; none may exist yet.
  parse(html){
   const rounds=[];
   for(const part of html.split(/<h3\b/i).slice(1)){
    const heading=text(/>([\s\S]*?)<\/h3>/i.exec(part)?.[1]??'');
    if(!/workforce priority/i.test(heading))continue;
    const g=tables(part.split(/<h[23]\b/i)[0])[0];if(!g)continue;
    const [h,...rows]=g,cDate=column(h,/date issued/),cSize=column(h,/number of invitations/),cScore=column(h,/score/),cNotes=h.findIndex(x=>/notes/i.test(x));
    for(const r of rows){const date=isoDate(r[cDate]),score=firstNumber(r[cScore]);if(date&&score!==null)rounds.push({date,label:heading,detail:cNotes<0?'':(r[cNotes]??'').replace(/\s*Please refer to[\s\S]*$/,''),score,size:r[cSize]});}
   }
   if(!/Invitations to apply issued in \d{4}/i.test(text(html)))throw new Error('oinp: invitations page layout not recognized');
   return {updated:lastUpdated(html),rounds:newestFirst(rounds)};
  }}};

// Keep the most recent round for each distinct selection, within 120 days of the newest round, at most 8.
export function selectRecent(rounds,{days=120,limit=8}={}){
 if(!rounds.length)return [];
 const cutoff=new Date(Date.parse(rounds[0].date)-days*864e5).toISOString().slice(0,10),seen=new Set();
 const key=r=>r.group??`${r.label}|${r.detail}`;
 return rounds.filter(r=>r.date>=cutoff&&!seen.has(key(r))&&seen.add(key(r))).slice(0,limit).map(({group,...r})=>r);
}
