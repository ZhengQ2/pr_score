// Registry of live "rounds of invitations" data sources, one per immigration system, so the UI
// can compare a candidate's score against real recent draws instead of just the static CRS rules.
// Add an OINP (Ontario) or other provincial adapter later by registering a second source here;
// nothing in this file assumes Express Entry's draw shape, category names or program ids —
// a source only needs to describe its own streams and how to tell which ones a candidate
// currently qualifies for.
export const drawSources=new Map();

export function registerDrawSource(source){
 if(!source.id||!Array.isArray(source.coreStreams)||!source.coreStreams.length||typeof source.fetchLatestDraws!=='function'||typeof source.listEligibleStreams!=='function')throw new TypeError('A draw source requires id, coreStreams, fetchLatestDraws and listEligibleStreams');
 if(drawSources.has(source.id))throw new Error('Draw source already registered');
 drawSources.set(source.id,source);
}

// `draws` is assumed sorted newest-first (every registered fetchLatestDraws returns it that way).
export function latestDrawByStream(draws,streamId){
 return draws.find(d=>d.stream===streamId)??null;
}

// Classifies a stream against the candidate's current score, honoring `sinceDate` so a comparison
// never crosses a CRS grid change:
//  'met-latest' - the most recent in-window draw for this stream clears at the candidate's score
//  'met-before' - that draw doesn't, but an earlier in-window draw would have
//  'not-met'    - in-window draws exist for this stream, but none would have
//  'no-data'    - no draw for this stream has happened since `sinceDate`
export function classifyStreamOutcome(draws,streamId,total,sinceDate=null){
 const inWindow=d=>d.stream===streamId&&d.crs!==null&&(!sinceDate||d.date>=sinceDate);
 const latestInWindow=draws.find(inWindow)??null;
 if(!latestInWindow)return {status:'no-data',draw:null};
 if(total>=latestInWindow.crs)return {status:'met-latest',draw:latestInWindow};
 const lastEligible=draws.find(d=>inWindow(d)&&total>=d.crs)??null;
 return lastEligible?{status:'met-before',draw:lastEligible}:{status:'not-met',draw:null};
}

// The fetcher: resolves the source's latest draws once, then reports its always-shown "core"
// streams plus whichever additional streams `context` currently qualifies for (e.g. a French- or
// trade-category draw) — each with its true latest draw and, when `total` is given, an outcome
// bounded to `sinceDate`.
export async function eligibleStreamDraws(sourceId,context,{total=null,sinceDate=null}={}){
 const source=drawSources.get(sourceId);
 if(!source)throw new Error(`Unknown draw source: ${sourceId}`);
 const draws=await source.fetchLatestDraws();
 const seen=new Set();
 const streamIds=[...source.coreStreams,...source.listEligibleStreams(context)].filter(id=>seen.has(id)?false:seen.add(id));
 return streamIds.map(streamId=>({
  streamId,
  latest:latestDrawByStream(draws,streamId),
  outcome:total===null?null:classifyStreamOutcome(draws,streamId,total,sinceDate),
 }));
}
