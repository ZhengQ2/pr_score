import {test} from 'node:test';import assert from 'node:assert/strict';
import * as aaip from '../dist/aaip.js';
import * as sinp from '../dist/sinp.js';
import * as mpnp from '../dist/mpnp.js';
import * as pei from '../dist/pei-pnp.js';
import {scoringSystems} from '../dist/systems.js';
import {programs} from '../dist/programs.js';
const lang=n=>({test:'ielts',scores:[],tested:true,complete:true,levels:Array(4).fill(n)});
const mixed=levels=>({test:'ielts',scores:[],tested:true,complete:true,levels});

test('Every catalogued program has a registered system with a matching maximum',()=>{
 for(const pr of programs){const s=scoringSystems.get(pr.system);assert.ok(s,pr.slug);assert.equal(s.maxScore,pr.max,pr.slug);}
 assert.equal(new Set(programs.map(p=>p.slug)).size,programs.length);
});

test('AAIP maximum profile reaches 100',()=>{
 const p={...aaip.defaults(),age:30,education:5,educationLocation:'alberta',english:lang(9),french:lang(6),totalExperience:'12',canadaExperience:'alberta',family:true,jobOffer:true,sectorOffer:true,offerLocation:'rural',regulated:true};
 assert.equal(aaip.calculate(p).total,100);
});
test('AAIP language: English 10 vs French 8, higher wins, bilingual +3 needs CLB 4 in both',()=>{
 const sec=p=>aaip.calculate(p).sections[1].points;
 assert.equal(sec({...aaip.defaults(),french:lang(6)}),8);
 assert.equal(sec({...aaip.defaults(),english:lang(5),french:lang(6)}),11);
 assert.equal(sec({...aaip.defaults(),english:mixed([9,9,9,3]),french:lang(4)}),3);
});
test('AAIP job offer factors need a job offer; age bands',()=>{
 assert.equal(aaip.calculate({...aaip.defaults(),sectorOffer:true,regulated:true,offerLocation:'other'}).sections[5].points,0);
 assert.deepEqual([17,18,20,21,34,35,49,50].map(aaip.agePoints),[0,3,3,5,5,4,4,3]);
});
test('AAIP EOI needs CLB 4 in all four abilities',()=>{
 assert.equal(aaip.eligibility({...aaip.defaults(),english:mixed([5,5,5,3]),streamEligible:'yes',legalStatus:'yes'}).programs[0].status,'Not currently met');
 assert.equal(aaip.eligibility({...aaip.defaults(),english:lang(4),streamEligible:'yes',legalStatus:'yes'}).programs[0].status,'Likely eligible');
});

test('SINP maximum is 110 and connections depend on sub-category',()=>{
 const base={...sinp.defaults(),age:30,education:5,recentYears:5,olderYears:5,english:lang(9),french:lang(8)};
 assert.equal(sinp.calculate({...base,relative:true,pastWork:true,pastStudy:true}).total,110);
 assert.equal(sinp.calculate({...base,subcategory:'offer',jobOffer:true,relative:true}).total,110);
 assert.equal(sinp.calculate({...base,subcategory:'offer',relative:true}).total,80);
});
test('SINP language: stronger test is first, other is second',()=>{
 const d=sinp.calculate({...sinp.defaults(),english:lang(5),french:lang(7)}).sections[2].detail;
 assert.deepEqual(d,{'First language test':18,'Second language test':4});
});
test('SINP age bands and 60-point minimum',()=>{
 assert.deepEqual([17,18,21,22,34,35,45,46,50,51].map(sinp.agePoints),[0,8,8,12,12,10,10,8,8,0]);
 const p={...sinp.defaults(),english:lang(7),recentYears:5,relatedEducation:'yes',skilledWork:'yes',legalStatus:'yes',funds:'yes'};
 assert.equal(sinp.calculate(p).total,60); // 20 + 10 + 18 + 12
 assert.equal(sinp.eligibility(p).programs[0].status,'Likely eligible');
 assert.equal(sinp.eligibility({...p,recentYears:4}).programs[0].status,'Not currently met');
});

test('MPNP maximum is 1000',()=>{
 const p={...mpnp.defaults(),age:30,english:lang(9),french:lang(5),experience:4,licensed:true,education:6,demand:'employment'};
 assert.equal(mpnp.calculate(p).total,1000);
});
test('MPNP first language is scored per ability band; second needs CLB 5',()=>{
 const d=mpnp.calculate({...mpnp.defaults(),english:mixed([8,7,6,4]),french:mixed([5,5,5,4])}).sections[0].detail;
 assert.deepEqual(d,{'First official language (per ability)':25+22+20+12,'Second official language CLB 5+':0});
});
test('MPNP adaptability: best connection, regional only with a connection, demand replaces both',()=>{
 const adapt=q=>mpnp.calculate({...mpnp.defaults(),...q}).sections[4].points;
 assert.equal(adapt({connection:'relative',regional:true}),250);
 assert.equal(adapt({regional:true}),0);
 assert.equal(adapt({connection:'friend',regional:true,demand:'strategic'}),500);
});
test('MPNP risk deductions and age bands',()=>{
 assert.equal(mpnp.calculate({...mpnp.defaults(),workOther:true,studyOther:true}).total,185-200);
 assert.deepEqual([17,18,19,20,21,45,46,47,48,49,50].map(mpnp.agePoints),[0,20,30,40,75,75,40,30,20,10,0]);
});

test('PEI labour streams total 100 at the maximum',()=>{
 const all=Object.fromEntries([...pei.employmentFactors,...pei.adaptabilityFactors].map(([k])=>[k,true]));
 for(const [stream] of pei.streams){
  const p={...pei.defaults(),...all,stream,age:27,education:'masters',experience:'6+',english:lang(9)};
  assert.equal(pei.calculate(p).total,100,stream);
 }
});
test('PEI labour language adds both tests up to 20; Express Entry uses the better test',()=>{
 const langPts=q=>pei.calculate({...pei.defaults(),...q}).sections[1].points;
 assert.equal(langPts({english:lang(6),french:lang(5)}),15);
 assert.equal(langPts({english:lang(9),french:lang(8)}),20);
 assert.equal(langPts({stream:'ee-offer',english:lang(8),french:lang(7)}),15);
 assert.equal(langPts({stream:'critical',employerForm:true}),0);
 assert.equal(langPts({stream:'sw-pei',employerForm:true}),20);
});
test('PEI age and education differ by stream',()=>{
 assert.deepEqual([24,25,29,30,44,45,49,50].map(a=>pei.agePoints(a,'ee-none')),[7,20,20,15,15,10,10,0]);
 assert.deepEqual([24,25,45].map(a=>pei.agePoints(a,'ig')),[10,25,15]);
 const edu=(stream,education)=>pei.calculate({...pei.defaults(),stream,education}).sections.find(s=>s.name==='Education').points;
 assert.equal(edu('critical','secondary'),10);assert.equal(edu('sw-out','secondary'),0);assert.equal(edu('ie','secondary'),15);assert.equal(edu('ig','diploma'),20);
});
test('PEI International Graduate has no language or experience sections',()=>{
 assert.deepEqual(pei.calculate({...pei.defaults(),stream:'ig'}).sections.map(s=>s.name),['Age','Education','Employment','Adaptability']);
});
