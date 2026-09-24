import {test} from 'node:test';import assert from 'node:assert/strict';
import {drawSources,registerDrawSource,latestDrawByStream,classifyStreamOutcome,eligibleStreamDraws} from '../dist/draw-sources.js';
import {canonicalStream,normalizeRound,listEligibleStreams,STREAM_LABELS,ROUNDS_PAGE} from '../dist/express-entry-draws.js';
import {defaults} from '../dist/express-entry.js';

const notEligible=()=>({programs:[{id:'CEC',status:'Not currently met'},{id:'FSW',status:'Needs more information'}]});
const lang=n=>({tested:true,levels:Array(4).fill(n)});

test('canonicalStream matches current and older/versioned IRCC draw names',()=>{
 assert.equal(canonicalStream('Canadian Experience Class'),'cec');
 assert.equal(canonicalStream('Federal Skilled Worker'),'fsw');
 assert.equal(canonicalStream('Federal Skilled Trades'),'fst');
 assert.equal(canonicalStream('Provincial Nominee Program'),'pnp');
 assert.equal(canonicalStream('General'),'general');
 assert.equal(canonicalStream('Healthcare and Social Services Occupations, 2026-Version 3'),'healthcare');
 assert.equal(canonicalStream('French-Language proficiency 2026-Version 2'),'french');
 assert.equal(canonicalStream('Trade occupations (Version 1)'),'trades-occupations');
 assert.equal(canonicalStream('Some future category IRCC has not invented yet'),'other');
});

test('normalizeRound strips comma formatting and keeps the source label',()=>{
 const round=normalizeRound({drawName:'Canadian Experience Class',drawNumber:'443',drawDate:'2026-09-15',drawSize:'2,000',drawCRS:'519'});
 assert.deepEqual(round,{system:'canada-express-entry',stream:'cec',label:'Canadian Experience Class',drawNumber:443,date:'2026-09-15',size:2000,crs:519,url:ROUNDS_PAGE});
});

test('normalizeRound tolerates missing/non-numeric fields',()=>{
 const round=normalizeRound({drawName:'General',drawNumber:'1',drawDate:'2015-01-31',drawSize:'—',drawCRS:'886'});
 assert.equal(round.size,null);
 assert.equal(round.crs,886);
});

test('listEligibleStreams flags French only once NCLC 7+ in all four abilities, and PNP once nominated',()=>{
 assert.deepEqual(listEligibleStreams({state:defaults(),eligibilityResult:notEligible()}),[]);
 assert.deepEqual(listEligibleStreams({state:{...defaults(),french:lang(7)},eligibilityResult:notEligible()}),['french']);
 assert.deepEqual(listEligibleStreams({state:{...defaults(),french:{tested:true,levels:[7,7,7,6]}},eligibilityResult:notEligible()}),[]);
 assert.deepEqual(listEligibleStreams({state:{...defaults(),nomination:true},eligibilityResult:notEligible()}),['pnp']);
});

test('STREAM_LABELS covers every core and special stream id',()=>{
 for(const id of ['cec','fsw','fst','general','french','pnp'])assert.equal(typeof STREAM_LABELS[id],'string');
});

test('registerDrawSource validates required fields and rejects duplicates',()=>{
 assert.throws(()=>registerDrawSource({id:'x'}),TypeError);
 assert.throws(()=>registerDrawSource({id:'x',coreStreams:[],fetchLatestDraws:async()=>[],listEligibleStreams:()=>[]}),TypeError);
 const source={id:'mock-system-a',coreStreams:['general'],listEligibleStreams:()=>[],fetchLatestDraws:async()=>[]};
 registerDrawSource(source);
 assert.throws(()=>registerDrawSource(source),/already registered/);
 assert.equal(drawSources.get('mock-system-a'),source);
});

test('latestDrawByStream returns the first (newest) match or null',()=>{
 const draws=[{stream:'cec',date:'2026-09-15'},{stream:'fsw',date:'2026-09-01'},{stream:'cec',date:'2026-08-01'}];
 assert.equal(latestDrawByStream(draws,'cec'),draws[0]);
 assert.equal(latestDrawByStream(draws,'fst'),null);
});

test('classifyStreamOutcome reports met-latest, met-before, not-met and no-data',()=>{
 const draws=[
  {stream:'cec',date:'2026-09-15',crs:519},
  {stream:'cec',date:'2026-06-01',crs:480},
  {stream:'cec',date:'2024-01-01',crs:300},
  {stream:'general',date:'2024-04-23',crs:529},
 ];
 assert.deepEqual(classifyStreamOutcome(draws,'cec',520,'2025-03-25'),{status:'met-latest',draw:draws[0]});
 assert.deepEqual(classifyStreamOutcome(draws,'cec',490,'2025-03-25'),{status:'met-before',draw:draws[1]});
 assert.deepEqual(classifyStreamOutcome(draws,'cec',400,'2025-03-25'),{status:'not-met',draw:null});
 // The only "general" draw predates the CRS revision, so nothing in-window exists at all.
 assert.deepEqual(classifyStreamOutcome(draws,'general',900,'2025-03-25'),{status:'no-data',draw:null});
 assert.deepEqual(classifyStreamOutcome(draws,'fst',900,'2025-03-25'),{status:'no-data',draw:null});
});

test('eligibleStreamDraws always includes core streams and adds qualifying special streams',async()=>{
 const draws=[{stream:'general',date:'2026-01-01',crs:500},{stream:'cec',date:'2026-01-01',crs:480},{stream:'french',date:'2026-01-01',crs:379}];
 registerDrawSource({id:'mock-system-b',coreStreams:['general','cec'],listEligibleStreams:({state})=>state.frenchEligible?['french']:[],fetchLatestDraws:async()=>draws});
 const withoutFrench=await eligibleStreamDraws('mock-system-b',{state:{}});
 assert.deepEqual(withoutFrench.map(s=>s.streamId),['general','cec']);
 assert.equal(withoutFrench[0].outcome,null);
 const withFrench=await eligibleStreamDraws('mock-system-b',{state:{frenchEligible:true}},{total:490,sinceDate:'2025-01-01'});
 assert.deepEqual(withFrench.map(s=>s.streamId),['general','cec','french']);
 assert.equal(withFrench.find(s=>s.streamId==='cec').outcome.status,'met-latest');
 assert.equal(withFrench.find(s=>s.streamId==='general').outcome.status,'not-met');
});

test('eligibleStreamDraws rejects an unknown source id',async()=>{
 await assert.rejects(()=>eligibleStreamDraws('no-such-system',{state:{}}),/Unknown draw source/);
});
