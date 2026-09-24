// Shared helpers for provincial nominee adapters. Provincial grids score the lowest CLB/NCLC across the
// four abilities of a complete, valid test; incomplete or missing tests score as zero.
export const lowestLevel=language=>language?.tested?Math.min(...language.levels):0;
export const triValue=value=>value==='unknown'?null:value==='yes';
export function programResult(id,name,checks,url){
 return {id,name,checks,url,status:checks.some(c=>c[1]===false)?'Not currently met':checks.some(c=>c[1]===null)?'Needs more information':'Likely eligible'};
}
// OINP "listed skilled trade" NOCs: major groups 72 (not 726), 73, 82, 83, 93 (not 932), minor group 6320, unit 62200.
export function isOinpSkilledTrade(code){
 const c=String(code??'');if(!/^\d{5}$/.test(c))return false;
 const major=c.slice(0,2),sub=c.slice(0,3);
 return (major==='72'&&sub!=='726')||major==='73'||major==='82'||major==='83'||(major==='93'&&sub!=='932')||c.startsWith('6320')||c==='62200';
}
