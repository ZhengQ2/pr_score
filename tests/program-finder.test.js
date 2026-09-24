import {test} from 'node:test';import assert from 'node:assert/strict';
import {questions,defaultAnswers,isAnswered,optionLabel,recommend,crsProfile,sinpProfile} from '../dist/program-finder.js';
import * as ee from '../dist/express-entry.js';
import * as sinp from '../dist/sinp.js';
import {programs} from '../dist/programs.js';

const base={location:'outside',destination:'any',age:'30-34',spouse:'no',education:'bachelor',english:7,french:0,teer:'01',trade:'no',canadaYears:0,foreignYears:3,jobOffer:'none',family:[],history:[],funds:'yes'};
const answers=over=>({...defaultAnswers(),...base,...over});
const find=(r,id)=>r.results.find(m=>m.id===id);
const RANK={strong:3,possible:2,unlikely:1};

test('Questions have unique ids and valid options, and start unanswered',()=>{
 assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
 const a=defaultAnswers();
 for(const q of questions){assert.ok(q.options.length>=2,q.id);assert.equal(isAnswered(q,a),Boolean(q.multi),q.id);}
 assert.equal(optionLabel(questions.find(q=>q.id==='english'),9),'CLB 9');
 assert.equal(optionLabel(questions.find(q=>q.id==='family'),['mb','sk']),'Manitoba, Saskatchewan');
});

test('Every calculator appears once, ranked strong, then possible, then unlikely',()=>{
 for(const a of [defaultAnswers(),answers({}),answers({jobOffer:'on',canadaYears:1,location:'canada'})]){
  const r=recommend(a);
  for(const pr of programs)assert.equal(r.results.filter(m=>m.id===pr.slug).length,1,pr.slug);
  for(let i=1;i<r.results.length;i++)assert.ok(RANK[r.results[i-1].fit]>=RANK[r.results[i].fit]);
 }
});

test('Estimates come from the real CRS and SINP calculators',()=>{
 const a=answers({english:9,french:7,canadaYears:1,spouse:'yes'}),r=recommend(a);
 const expected=ee.calculate({...ee.defaults(),age:32,spouse:true,education:4,canadian:1,foreign:3,english:{tested:true,levels:[9,9,9,9]},french:{tested:true,levels:[7,7,7,7]},fswYears:4,adaptWork:true}).total;
 assert.equal(r.crs,expected);assert.equal(find(r,'ee').estimate.value,expected);
 assert.equal(ee.calculate(crsProfile({age:32,spouse:true,education:'bachelor',canada:1,foreign:3,skilled:4,en:9,fr:7,certified:false,offer:'none'})).total,expected);
 const sk=find(r,'sinp');
 assert.equal(sk.estimate.value,sinp.calculate(sinpProfile({age:32,education:'bachelor',skilled:4,en:9,fr:7,offer:'none',family:[],history:[]})).total);
 assert.equal(sk.estimate.value,20+8+20+8+12);// bachelor, 4 recent years, CLB 8+ first, NCLC 7 second, age 22–34
});

test('Canadian skilled work with CLB 7 is a strong Express Entry match through CEC',()=>{
 const r=recommend(answers({location:'canada',canadaYears:1,foreignYears:0,funds:'no'}));
 const m=find(r,'ee');assert.equal(m.fit,'strong');assert.equal(m.path,'Canadian Experience Class');assert.equal(r.results[0].id,'ee');
 // TEER 0/1 CEC needs CLB 7; TEER 2/3 needs 5.
 assert.equal(find(recommend(answers({canadaYears:1,foreignYears:0,english:6,funds:'no'})),'ee').fit,'unlikely');
 assert.equal(find(recommend(answers({canadaYears:1,foreignYears:0,english:6,teer:'23',funds:'no'})),'ee').fit,'strong');
});

test('FSW needs 67 selection points and funds; unknown funds leaves it worth exploring',()=>{
 // CLB 7 + 3 years + bachelor at 30–34 is 60/100; CLB 9 raises language from 16 to 24 points.
 assert.equal(find(recommend(answers({})),'ee').fit,'unlikely');
 assert.equal(find(recommend(answers({english:9})),'ee').path,'Federal Skilled Worker');
 assert.equal(find(recommend(answers({english:9})),'ee').fit,'strong');
 assert.equal(find(recommend(answers({english:9,funds:'unsure'})),'ee').fit,'possible');
 assert.equal(find(recommend(answers({age:'51+',education:'secondary',foreignYears:1})),'ee').fit,'unlikely');
});

test('Wanting to live in Quebec rules out Express Entry and other provinces, and surfaces Quebec',()=>{
 const r=recommend(answers({destination:'qc'}));
 assert.equal(find(r,'ee').fit,'unlikely');
 assert.ok(find(r,'ee').checks.some(([l,ok])=>l==='Plan to live outside Quebec'&&ok===false));
 const qc=find(r,'qc');assert.ok(qc&&qc.external&&qc.preferred);assert.equal(qc.fit,'possible');
 assert.equal(find(r,'oinp').fit,'unlikely');
});

test('A provincial job offer makes that province a strong match',()=>{
 const on=recommend(answers({location:'canada',jobOffer:'on',destination:'on',teer:'23',english:6,education:'two-year',canadaYears:1,foreignYears:0}));
 assert.equal(find(on,'oinp').fit,'strong');assert.ok(find(on,'oinp').preferred);
 assert.equal(find(on,'bc-pnp').fit,'unlikely');
 const bc=recommend(answers({jobOffer:'bc',teer:'23',english:4,foreignYears:2}));
 assert.equal(find(bc,'bc-pnp').fit,'strong');
 assert.equal(find(recommend(answers({jobOffer:'bc',teer:'45',english:4,foreignYears:2})),'bc-pnp').fit,'unlikely');
 const mb=recommend(answers({location:'canada',jobOffer:'mb'}));
 assert.equal(find(mb,'mpnp').fit,'strong');assert.equal(find(mb,'mpnp').path,'Skilled Worker in Manitoba');
});

test('Manitoba needs a connection; Atlantic provinces only appear with a reason',()=>{
 assert.equal(find(recommend(answers({})),'mpnp').fit,'unlikely');
 assert.equal(find(recommend(answers({family:['mb']})),'mpnp').fit,'possible');
 const none=recommend(answers({}));
 for(const code of ['nb','ns','nl','qc'])assert.equal(find(none,code),undefined,code);
 const ns=find(recommend(answers({jobOffer:'ns'})),'ns');assert.equal(ns.fit,'strong');assert.match(ns.href,/^https:/);
});

test('Provincial Express Entry streams follow the federal result',()=>{
 const eligible=recommend(answers({english:9}));
 assert.equal(find(eligible,'pei-pnp').path,'PEI Express Entry');assert.equal(find(eligible,'pei-pnp').fit,'possible');
 const ineligible=recommend(answers({english:4,foreignYears:0}));
 assert.equal(find(ineligible,'pei-pnp').fit,'unlikely');assert.equal(find(ineligible,'aaip').fit,'unlikely');
});
