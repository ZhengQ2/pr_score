import {test} from 'node:test';import assert from 'node:assert/strict';
import * as oinp from '../dist/oinp.js';
import * as bc from '../dist/bc-pnp.js';
import {isOinpSkilledTrade} from '../dist/provincial-common.js';
import {scoringSystems} from '../dist/systems.js';
const lang=n=>({test:'ielts',scores:[],tested:true,complete:true,levels:Array(4).fill(n)});

test('Provincial systems are registered alongside Express Entry',()=>{
 assert.deepEqual([...scoringSystems.keys()],['canada-express-entry','oinp','bc-pnp','aaip','sinp','mpnp','pei-pnp']);
 assert.equal(scoringSystems.get('oinp').maxScore,130);assert.equal(scoringSystems.get('bc-pnp').maxScore,200);
});

test('OINP defaults score only education and nothing else',()=>{
 const r=oinp.calculate(oinp.defaults());assert.equal(r.total,6);assert.equal(r.firstLanguage,null);
});

test('OINP maximum profile reaches 130',()=>{
 const p={...oinp.defaults(),teer:'1',category:'3',wage:45,positionMonths:'gt24',earnings:'70',status:'work',education:9,credentials:2,english:lang(10),french:lang(9),region:'north'};
 assert.equal(oinp.calculate(p).total,130);
});

test('OINP wage bands and boundaries',()=>{
 assert.equal(oinp.wagePoints(''),0);assert.equal(oinp.wagePoints(19.99),0);assert.equal(oinp.wagePoints(20),5);assert.equal(oinp.wagePoints(29.99),8);assert.equal(oinp.wagePoints(35),12);assert.equal(oinp.wagePoints(40),15);
});

test('OINP Ontario work only counts with under 6 months in the position',()=>{
 const base={...oinp.defaults(),ontarioMonths:'gt24'};
 assert.equal(oinp.calculate(base).sections[0].points,12);
 assert.equal(oinp.calculate({...base,positionMonths:'6-12'}).sections[0].points,12);
 assert.equal(oinp.calculate({...base,positionMonths:'13-24'}).sections[0].points,15);
});

test('OINP language uses lowest ability, higher language, and the two-language bonus needs CLB 6 in both',()=>{
 const p={...oinp.defaults(),english:{...lang(9),levels:[9,9,9,7]}};
 assert.deepEqual(oinp.calculate(p).sections[2].detail,{'Official language ability':8,'Knowledge of official languages':5});
 assert.equal(oinp.calculate({...p,french:lang(5)}).sections[2].points,13);
 assert.equal(oinp.calculate({...p,french:lang(6)}).sections[2].points,18);
});

test('OINP physicians are TEER 1 / category 3 with no wage points',()=>{
 const r=oinp.calculate({...oinp.defaults(),path:'physician',wage:50,physicianMonths:'gt24'});
 assert.deepEqual(r.sections[0].detail,{'NOC TEER category':9,'Broad occupational category':10,'Hourly wage':0,'Ontario medical practice':18,'Earnings history':0,'Legal status in Canada':0});
});

test('OINP skilled trades follow the official NOC groups',()=>{
 for(const code of ['72310','73300','82010','83100','93100','63200','62200'])assert.ok(isOinpSkilledTrade(code),code);
 for(const code of ['72600','93200','21231','62020'])assert.ok(!isOinpSkilledTrade(code),code);
});

test('OINP language minimum depends on TEER and trade; graduates are exempt',()=>{
 const p={...oinp.defaults(),teer:'2',english:lang(5),jobOffer:'yes',workExperience:'yes',intention:'yes',status:'work',education:3};
 const status=q=>oinp.eligibility(q).programs[0].status;
 assert.equal(status(p),'Not currently met');
 assert.equal(status({...p,skilledTrade:true}),'Likely eligible');
 assert.equal(status({...p,recentGrad:true}),'Likely eligible');
 assert.equal(status({...p,teer:'4',english:lang(4),education:1}),'Likely eligible');
 assert.equal(status({...p,teer:'unknown'}),'Needs more information');
});

test('OINP non-trades TEER 0–3 require post-secondary education',()=>{
 const p={...oinp.defaults(),teer:'1',english:lang(7),jobOffer:'yes',workExperience:'yes',intention:'yes',status:'work',education:1};
 assert.equal(oinp.eligibility(p).programs[0].status,'Not currently met');
 assert.equal(oinp.eligibility({...p,skilledTrade:true}).programs[0].status,'Likely eligible');
});

test('BC PNP defaults: bachelor’s only',()=>{assert.equal(bc.calculate(bc.defaults()).total,15);});

test('BC PNP maximum profile reaches 200 and sections cap',()=>{
 const p={...bc.defaults(),experience:6,canadaExperience:true,currentEmployer:true,education:6,educationLocation:'bc',designation:true,english:lang(10),french:lang(4),wage:80,area:'3',regionalBonus:true};
 const r=bc.calculate(p);assert.equal(r.total,200);assert.equal(r.sections[1].points,40);
});

test('BC PNP wage points: $16 → 1, $1 per point, $70 → 55',()=>{
 assert.equal(bc.wagePoints(null),0);assert.equal(bc.wagePoints(15.99),0);assert.equal(bc.wagePoints(16),1);assert.equal(bc.wagePoints(38.5),23);assert.equal(bc.wagePoints(69.99),54);assert.equal(bc.wagePoints(70),55);assert.equal(bc.wagePoints(120),55);
});

test('BC PNP annual salary converts with hours clamped to 30–40',()=>{
 const p={...bc.defaults(),wageType:'annual',wage:83200,hours:40};
 assert.equal(bc.hourlyWage(p),40);
 assert.equal(bc.hourlyWage({...p,hours:45}),40);
 assert.equal(bc.hourlyWage({...p,hours:20}),83200/52/30);
 assert.equal(bc.calculate(p).sections[3].points,25);
});

test('BC PNP regional bonus only outside Metro Vancouver; Canadian education bonus needs post-secondary',()=>{
 assert.equal(bc.calculate({...bc.defaults(),area:'1',regionalBonus:true}).sections[4].points,0);
 assert.equal(bc.calculate({...bc.defaults(),area:'2',regionalBonus:true}).sections[4].points,15);
 assert.equal(bc.calculate({...bc.defaults(),education:0,educationLocation:'bc'}).sections[1].points,0);
});

test('BC PNP language: lowest CLB, better language, both-language bonus at CLB 4+',()=>{
 const r=bc.calculate({...bc.defaults(),english:{...lang(9),levels:[9,9,8,9]},french:lang(4)});
 assert.deepEqual(r.sections[2].detail,{'English or French proficiency':25,'Both English and French':10});
});

test('BC PNP Skilled Worker screening: ineligible NOCs, TEER, language and minimum income',()=>{
 const p={...bc.defaults(),noc:'21231',teer:'1',wage:20,hours:30,jobOffer:'yes',skilledExperience:'yes',qualified:'yes',legalStatus:'yes',intention:'yes'};
 const sw=q=>bc.eligibility(q).programs[0];
 // $20 × 30 h × 52 = $31,200: below Metro Vancouver's $31,264 for one person, above the rest-of-B.C. $26,057.
 assert.equal(bc.annualIncome(p),31200);
 assert.equal(sw(p).status,'Not currently met');
 assert.equal(sw({...p,residence:'rest'}).status,'Likely eligible');
 assert.equal(sw({...p,residence:'rest',familySize:2}).status,'Not currently met');
 assert.equal(sw({...p,residence:'rest',familySize:2,spouseIncome:10000}).status,'Likely eligible');
 p.wage=40;
 assert.equal(sw({...p,noc:'13110',teer:'3',english:lang(5)}).status,'Not currently met');
 assert.equal(sw({...p,noc:'21232',teer:'2'}).status,'Not currently met');
 assert.equal(sw({...p,noc:'21232',teer:'2',english:lang(4)}).status,'Likely eligible');
});

test('BC PNP health streams check occupation lists',()=>{
 const p={...bc.defaults(),noc:'31301',teer:'1',wage:50,jobOffer:'yes',qualified:'yes',legalStatus:'yes',intention:'yes',haSupport:'yes'};
 assert.equal(bc.eligibility(p).programs[1].status,'Likely eligible');
 assert.equal(bc.eligibility({...p,noc:'21231'}).programs[1].status,'Not currently met');
 const rural={...p,noc:'65310',teer:'5',wage:25,english:lang(4),ruralWork:'yes'};
 assert.equal(bc.eligibility(rural).programs[2].status,'Likely eligible');
 assert.equal(bc.eligibility(rural).programs[0].status,'Not currently met');
});
