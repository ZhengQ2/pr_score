import {registerDrawSource} from './draw-sources.js';
import {levels} from './express-entry.js';

// IRCC publishes this JSON feed alongside its public "Rounds of invitations" page — same data,
// refreshed several times an hour, served with Access-Control-Allow-Origin: * so it can be
// fetched directly from the browser.
export const ROUNDS_URL='https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
export const ROUNDS_PAGE='https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html';

// IRCC's drawName wording drifts and grows version suffixes over time (e.g. "Healthcare
// occupations (Version 1)" later became "...2026-Version 3"), so match by keyword rather than
// an exact string. Order matters: first match wins.
const STREAM_PATTERNS=[
 ['cec',/canadian experience class/i],
 ['fsw',/federal skilled worker/i],
 ['fst',/federal skilled trades/i],
 ['pnp',/provincial nominee/i],
 ['french',/french/i],
 ['healthcare',/health/i],
 ['stem',/\bstem\b/i],
 ['trades-occupations',/trade occupations/i],
 ['transport',/transport occupations/i],
 ['agriculture',/agri/i],
 ['education',/education occupations/i],
 ['general',/^general$/i],
];

export function canonicalStream(drawName=''){
 const hit=STREAM_PATTERNS.find(([,pattern])=>pattern.test(drawName));
 return hit?hit[0]:'other';
}

const toNumber=value=>{const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null;};

export function normalizeRound(round){
 return {
  system:'canada-express-entry',
  stream:canonicalStream(round.drawName),
  label:round.drawName,
  drawNumber:toNumber(round.drawNumber),
  date:round.drawDate,
  size:toNumber(round.drawSize),
  crs:toNumber(round.drawCRS),
  url:ROUNDS_PAGE,
 };
}

let cached=null;
export async function fetchLatestDraws(){
 if(cached)return cached;
 const response=await fetch(ROUNDS_URL);
 if(!response.ok)throw new Error(`Express Entry rounds request failed: ${response.status}`);
 const data=await response.json();
 cached=(data.rounds??[]).map(normalizeRound).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
 return cached;
}

// Always shown, regardless of the candidate's current eligibility — the three federal programs
// plus the general pool are the baseline reference points.
const CORE_STREAMS=['general','cec','fsw','fst'];

// Category-based draws also invite from the pool, but only shown once the candidate actually
// qualifies for that category. Healthcare, STEM, skilled-trades, transport, agriculture and
// education categories select by NOC-category membership, which this tool doesn't track yet (it
// only records a chosen occupation's TEER level) — add matchers here once that data exists.
const SPECIAL_STREAMS=[
 {id:'french',label:'French language proficiency',isEligible:({state})=>levels(state.french).every(x=>x>=7)},
 {id:'pnp',label:'Provincial nominee',isEligible:({state})=>state.nomination===true},
];

export const STREAM_LABELS={cec:'Canadian Experience Class',fsw:'Federal Skilled Worker',fst:'Federal Skilled Trades',general:'General',...Object.fromEntries(SPECIAL_STREAMS.map(s=>[s.id,s.label]))};

export function listEligibleStreams(context){
 return SPECIAL_STREAMS.filter(s=>s.isEligible(context)).map(s=>s.id);
}

registerDrawSource({
 id:'canada-express-entry',
 name:'Canada · Express Entry',
 coreStreams:CORE_STREAMS,
 listEligibleStreams,
 fetchLatestDraws,
});
