export const normalize=text=>String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function searchOccupations(groups,query,limit=12){
 const q=normalize(query);if(q.length<2)return [];
 const tokens=q.split(' '),matches=[];
 for(const group of groups){
  const titles=[group.title,...group.titles];let best=null;
  for(const title of titles){const text=normalize(title);if(!tokens.every(token=>text.includes(token)||group.code.includes(token)))continue;
   const rank=text===q||group.code===q?0:text.startsWith(q)?1:text.includes(q)?2:3;
   if(!best||rank<best.rank)best={...group,matchedTitle:title,rank};
  }
  if(best)matches.push(best);
 }
 return matches.sort((a,b)=>a.rank-b.rank||a.matchedTitle.localeCompare(b.matchedTitle)).slice(0,limit);
}
export const teerGroup=teer=>teer<=1?'01':teer<=3?'23':'45';
