// Program finder: a short questionnaire that ranks the federal and provincial programs by how well they fit the
// candidate. Pure and UI-free. Each program is screened with a few headline requirements (the same ones the
// calculators check) and, where the answers allow it, an estimate from the real scoring modules. It is a
// shortlist, not an eligibility decision: every result links to the full calculator or the official page.
import * as ee from './express-entry.js';
import * as sinp from './sinp.js';
import {programs,unscored} from './programs.js';

const PROVINCES=[['on','Ontario'],['bc','British Columbia'],['ab','Alberta'],['sk','Saskatchewan'],['mb','Manitoba'],['pe','Prince Edward Island'],['nb','New Brunswick'],['ns','Nova Scotia'],['nl','Newfoundland and Labrador'],['qc','Quebec'],['territory','Yukon, Northwest Territories or Nunavut']];
export const regionName=code=>PROVINCES.find(p=>p[0]===code)?.[1]??code;
const LANGUAGE=[[0,'No valid test yet'],[3,'Below CLB 4'],...[4,5,6,7,8,9].map(n=>[n,`CLB ${n}`]),[10,'CLB 10 or higher']];
const YEARS=[[0,'None'],[0.5,'Less than 1 year'],[1,'1 year'],[2,'2 years'],[3,'3 years or more']];

// Question order is the questionnaire order. `multi` questions take an array of values; selecting a multi question's
// `exclusive` value clears the others (and vice versa), and an empty selection reads as `emptyLabel`.
export const questions=[
 {id:'location',title:'Where do you live right now?',options:[['outside','Outside Canada'],['canada','In Canada, with valid status (work or study permit, visitor)']]},
 {id:'destination',title:'Where would you like to live in Canada?',hint:'Select every province you’d consider. Provincial programs require you to intend to live in that province; Express Entry is for living outside Quebec.',multi:true,exclusive:'any',emptyLabel:'Anywhere: I’m flexible',options:[['any','Anywhere: I’m flexible'],...PROVINCES]},
 {id:'age',title:'How old are you?',options:[['18-21','18 to 21'],['22-29','22 to 29'],['30-34','30 to 34'],['35-39','35 to 39'],['40-44','40 to 44'],['45-50','45 to 50'],['51+','51 or older']]},
 {id:'spouse',title:'Will a spouse or common-law partner come with you to Canada?',options:[['no','No'],['yes','Yes']]},
 {id:'education',title:'What is your highest completed education?',hint:'Credentials from outside Canada need an Educational Credential Assessment (ECA) for most programs.',options:[['none','Less than high school'],['secondary','High school diploma'],['one-year','One-year post-secondary certificate'],['two-year','Two-year post-secondary diploma'],['trade','Trade certification (journeyperson level)'],['bachelor','Bachelor’s degree or a program of three years or more'],['masters','Master’s or professional degree (medicine, law, …)'],['phd','Doctorate (PhD)']]},
 {id:'english',title:'English test result: your lowest ability',hint:'IELTS General, CELPIP-General or PTE Core, converted to CLB. Use the lowest of speaking, listening, reading and writing.',options:LANGUAGE},
 {id:'french',title:'French test result: your lowest ability',hint:'TEF Canada or TCF Canada, converted to NCLC. Choose “No valid test yet” if you haven’t taken one.',options:LANGUAGE.map(([v,l])=>[v,l.replace('CLB','NCLC')])},
 {id:'teer',title:'What skill level is your main occupation?',hint:'NOC 2021 TEER category. TEER 0–1: management and jobs usually needing a degree. TEER 2–3: jobs needing a college diploma, apprenticeship or on-the-job training. TEER 4–5: jobs needing high school or short training.',options:[['01','TEER 0 or 1'],['23','TEER 2 or 3'],['45','TEER 4 or 5'],['unsure','I’m not sure']]},
 {id:'trade',title:'Is your occupation a skilled trade?',hint:'For example electricians, welders, plumbers, cooks, heavy-duty mechanics or carpenters.',options:[['no','No'],['yes','Yes, without a Canadian certificate of qualification'],['certified','Yes, with a Canadian provincial or territorial certificate of qualification']]},
 {id:'canadaYears',title:'Skilled work experience in Canada (last 3 years)',hint:'Paid, full-time (or equivalent part-time) work in a TEER 0–3 occupation, with authorization. Self-employment and work while a full-time student don’t count.',options:YEARS},
 {id:'foreignYears',title:'Skilled work experience outside Canada (last 10 years)',hint:'Paid, full-time (or equivalent) work in a TEER 0–3 occupation.',options:YEARS},
 {id:'jobOffer',title:'Do you have a full-time, permanent job offer from a Canadian employer?',options:[['none','No job offer'],...PROVINCES.map(([v,l])=>[v,`Yes, in ${l}`])]},
 {id:'family',title:'Do you have a close relative who is a permanent resident or citizen living in any of these provinces?',hint:'Parent, child, sibling, aunt or uncle, niece or nephew, first cousin, or grandparent. Select all that apply.',multi:true,options:PROVINCES.filter(([v])=>v!=='territory')},
 {id:'history',title:'Have you worked or studied in any of these provinces?',hint:'Select all that apply.',multi:true,options:PROVINCES.filter(([v])=>v!=='territory')},
 {id:'funds',title:'Could you show proof of settlement funds?',hint:'For a single person, Express Entry currently requires roughly $15,000; the amount grows with family size.',options:[['yes','Yes'],['no','No'],['unsure','I’m not sure']]}];

export function defaultAnswers(){return Object.fromEntries(questions.map(q=>[q.id,q.multi?[]:null]));}
export const isAnswered=(q,a)=>q.multi?Array.isArray(a[q.id]):a[q.id]!==null&&a[q.id]!==undefined;
export const optionLabel=(q,value)=>q.multi?(value?.length?value.map(v=>optionLabel({options:q.options},v)).join(', '):q.emptyLabel??'None'):(q.options.find(o=>String(o[0])===String(value))?.[1]??'Not answered');

const AGES={'18-21':20,'22-29':27,'30-34':32,'35-39':37,'40-44':42,'45-50':47,'51+':55};
const EDUCATION={none:[0,0],secondary:[1,0],'one-year':[2,1],'two-year':[3,2],trade:[2,3],bachelor:[4,4],masters:[6,5],phd:[7,5]}; // [CRS index, SINP index]
const POST_SECONDARY=['one-year','two-year','trade','bachelor','masters','phd'];
const language=n=>({test:'',scores:['','','',''],tested:n>0,complete:n>0,levels:Array(4).fill(n)});
const tri=v=>v==='yes'?true:v==='no'?false:null;
export const FIT={strong:'Strong match',possible:'Worth exploring',unlikely:'Not a fit right now'};
const RANK={strong:3,possible:2,unlikely:1};
const fitOf=checks=>checks.some(c=>c[1]===false)?'unlikely':checks.some(c=>c[1]===null)?'possible':'strong';

// Normalized view of the answers used by every rule below.
function facts(a){
 const n=k=>Number(a[k]??0);
 const f={en:n('english'),fr:n('french'),canada:n('canadaYears'),foreign:n('foreignYears'),age:AGES[a.age]??30,education:a.education??'secondary',
  teer:a.teer&&a.teer!=='unsure'?a.teer:null,trade:a.trade==='yes'||a.trade==='certified',certified:a.trade==='certified',offer:a.jobOffer??'none',
  inCanada:a.location==='canada',destinations:[a.destination??[]].flat().filter(d=>d&&d!=='any'),funds:tri(a.funds),spouse:a.spouse==='yes',family:a.family??[],history:a.history??[]};
 f.flexible=!f.destinations.length;f.wants=code=>f.destinations.includes(code);
 f.best=Math.max(f.en,f.fr);f.skilled=f.canada+f.foreign;f.skilledTeer=f.teer===null?null:f.teer!=='45';
 f.connected=code=>f.family.includes(code)||f.history.includes(code)||f.offer===code;
 return f;
}
const livesIn=(f,code)=>[`Plan to live in ${regionName(code)}`,f.flexible||f.wants(code)];
const languageCheck=(f,need,label=`CLB ${need}+ in all four abilities of one language`)=>[label,f.best>=need];

// Profiles for the real calculators. The estimate assumes no Canadian education, sibling or nomination and, with
// a spouse, gives the spouse no points, so it is conservative.
export function crsProfile(f){
 return {...ee.defaults(),age:f.age,spouse:f.spouse,education:EDUCATION[f.education][0],educationValid:true,canadian:Math.floor(f.canada),foreign:Math.floor(f.foreign),english:language(f.en),french:language(f.fr),certificate:f.certified,fswYears:Math.floor(f.skilled),fswOffer:f.offer!=='none'&&f.offer!=='qc',adaptWork:f.canada>=1};
}
export function sinpProfile(f){
 return {...sinp.defaults(),subcategory:f.offer==='sk'?'offer':'oid',age:f.age,education:EDUCATION[f.education][1],recentYears:Math.min(5,Math.floor(f.skilled)),english:language(f.en),french:language(f.fr),jobOffer:f.offer==='sk',relative:f.family.includes('sk'),pastWork:f.history.includes('sk')};
}

function expressEntry(f){
 const crs=ee.calculate(crsProfile(f)).total,fsw=ee.fswScore(crsProfile(f)).total;
 const outside=['Plan to live outside Quebec',f.flexible||f.destinations.some(d=>d!=='qc')];
 const cecLang=f.teer===null?(f.best>=7?true:f.best<5?false:null):f.best>=(f.teer==='01'?7:5);
 const paths=[
  {name:'Canadian Experience Class',checks:[['1 year of skilled Canadian work in the last 3 years',f.canada>=1],['Occupation in TEER 0–3',f.skilledTeer],[`CLB ${f.teer==='23'?5:f.teer==='01'?7:'5–7 (by TEER)'}+ in all four abilities`,cecLang],outside]},
  {name:'Federal Skilled Worker',checks:[['1 year of continuous skilled work in the last 10 years',f.skilled>=1],['Occupation in TEER 0–3',f.skilledTeer],languageCheck(f,7),['High school or higher (with an ECA if studied abroad)',f.education!=='none'],[`FSW selection score of 67 (estimated ${fsw} / 100)`,fsw>=67],['Settlement funds, or a job offer while authorized to work in Canada',f.inCanada&&f.offer!=='none'&&f.offer!=='qc'?true:f.funds],outside]},
  {name:'Federal Skilled Trades',checks:[['Occupation is a skilled trade',f.trade],['2 years of skilled trade work in the last 5 years',f.skilled>=2],['CLB 5 speaking and listening, 4 reading and writing',f.best>=5?true:f.best===4?null:false],['Canadian certificate of qualification or a one-year job offer',f.certified||(f.offer!=='none'&&f.offer!=='qc')?true:null],['Settlement funds, or a job offer while authorized to work in Canada',f.inCanada&&f.offer!=='none'&&f.offer!=='qc'?true:f.funds],outside]}];
 const notes=[`Estimated CRS score: ${crs} of 1,200 (without a provincial nomination${f.spouse?'; your spouse’s factors add nothing in this estimate':''}). Eligibility only lets you enter the pool; invitations go to the highest scores and to category-based draws.`];
 if(f.fr>=7)notes.push('NCLC 7+ in French adds up to 50 CRS points and makes you eligible for French-language category draws.');
 return {paths,notes,estimate:{label:'Estimated CRS',value:crs,max:1200}};
}

// Provincial rules keyed by province code. Each returns candidate paths; the best-fitting path is shown.
const provincial={
 on:f=>({paths:[{name:'Workforce Priority · job offer',checks:[['Full-time, permanent Ontario job offer',f.offer==='on'],
  (()=>{const need=f.teer==='45'?4:f.trade?5:f.teer===null?null:6;return need===null?['CLB 4–6 depending on the job offer',f.best>=6?true:f.best<4?false:null]:languageCheck(f,need);})(),
  [f.skilledTeer===false||f.trade?'High school diploma or equivalent':'Post-secondary credential of one academic year or more',f.skilledTeer===false||f.trade?f.education!=='none':f.skilledTeer===null&&!POST_SECONDARY.includes(f.education)?null:POST_SECONDARY.includes(f.education)],
  ['Work experience in the job offer position or occupation',f.canada>=1||f.skilled>=2?true:null],livesIn(f,'on')]}],
  notes:['Ontario’s employer and graduate streams were replaced by Workforce Priority in June 2026; every candidate now needs an Ontario job offer.']}),
 bc:f=>({paths:[{name:'Skills Immigration · Skilled Worker',checks:[['Full-time, indeterminate B.C. job offer',f.offer==='bc'],['Job offer in TEER 0–3',f.skilledTeer],['2 years of full-time skilled work in the last 10 years',f.skilled>=2],[f.teer==='01'?'Language test not required for TEER 0/1':'CLB 4+ in all four abilities (TEER 2–5)',f.teer==='01'?true:f.best>=4],livesIn(f,'bc')]}],
  notes:['TEER 4/5 job offers qualify only through the Rural/Remote Health Support Initiative (health authority security, cleaning and janitorial jobs).']}),
 ab:f=>({paths:[
  {name:'Alberta Opportunity Stream',checks:[['Working full-time in Alberta with a valid work permit',f.inCanada&&f.offer==='ab'?true:f.inCanada&&f.history.includes('ab')?null:false],languageCheck(f,4,'CLB 4+ in all four abilities (5+ for TEER 0–3)'),livesIn(f,'ab')]},
  {name:'Alberta Express Entry',checks:[['Eligible for a federal Express Entry program',null],['Alberta job offer, close family in Alberta, or a priority occupation',f.offer==='ab'||f.family.includes('ab')?true:null],languageCheck(f,4),livesIn(f,'ab')]}],
  notes:['All AAIP worker streams go through a Worker Expression of Interest that needs CLB 4+; Alberta invites by stream-specific priorities.']}),
 sk:f=>{const total=sinp.calculate(sinpProfile(f)).total;return {estimate:{label:'Estimated SINP points',value:total,max:sinp.MAX_SCORE},paths:[{name:f.offer==='sk'?'International Skilled Worker · Employment Offer':'International Skilled Worker · Occupations In-Demand',checks:[[`At least ${sinp.MINIMUM} of ${sinp.MAX_SCORE} points (estimated ${total})`,total>=sinp.MINIMUM],languageCheck(f,4),['1 year of skilled (TEER 0–3) work in the last 10 years',f.skilledTeer===false?false:f.skilled>=1],['Post-secondary education or training related to your occupation',POST_SECONDARY.includes(f.education)?null:false],['Proof of settlement funds',f.funds],livesIn(f,'sk')]}],
  notes:[`Saskatchewan has no draws scheduled; its last published selection score was ${sinp.lastSelection.score}. Experience 6–10 years ago isn’t counted in this estimate.`]};},
 mb:f=>({paths:[
  {name:'Skilled Worker in Manitoba',checks:[['Working in Manitoba with a full-time, permanent job offer',f.inCanada&&f.offer==='mb'],['Valid language test',f.best>0],livesIn(f,'mb')]},
  {name:'Skilled Worker Overseas',checks:[['Connection to Manitoba: close relative, past work or study, or an invitation',f.connected('mb')],['Valid language test',f.best>0],['Pathway work experience and language requirements',null],livesIn(f,'mb')]}],
  notes:['Every Manitoba candidate needs an established connection to the province.']}),
 pe:f=>({paths:[
  {name:'PEI Workforce · with a PEI employer',checks:[['Full-time job offer from a PEI employer',f.offer==='pe'],languageCheck(f,4),['Meet the stream-specific requirements',null],livesIn(f,'pe')]},
  {name:'PEI Express Entry',checks:[['Eligible for a federal Express Entry program',null],languageCheck(f,4),['Meet the stream-specific requirements',null],livesIn(f,'pe')]}]})};

// Provinces without a points grid appear only when the candidate has a reason to look at them.
function unscoredMatch(f,code){
 const relevant=f.offer===code||f.wants(code)||f.family.includes(code)||f.history.includes(code);
 if(!relevant)return null;
 if(code==='qc')return {paths:[{name:'Quebec skilled worker selection',checks:[['Plan to live in Quebec',f.flexible||f.wants('qc')],['Quebec selection criteria, including French',null]]}],notes:['Quebec selects its own skilled workers; you apply for federal permanent residence after receiving a Quebec Selection Certificate.']};
 return {paths:[{name:'Provincial nominee streams',checks:[[`Job offer from a ${regionName(code)} employer or a strong connection`,f.offer===code?true:null],livesIn(f,code)]}]};
}

const bestPath=paths=>paths.map(p=>({...p,fit:fitOf(p.checks),met:p.checks.filter(c=>c[1]===true).length/p.checks.length})).sort((x,y)=>RANK[y.fit]-RANK[x.fit]||y.met-x.met)[0];
const PROGRAM_CODES={oinp:'on','bc-pnp':'bc',aaip:'ab',sinp:'sk',mpnp:'mb','pei-pnp':'pe'};
const UNSCORED_CODES={'New Brunswick':'nb','Nova Scotia':'ns','Newfoundland and Labrador':'nl',Quebec:'qc'};

export function recommend(answers){
 const f=facts(answers),results=[];
 const federal=expressEntry(f),eePath=bestPath(federal.paths);
 const add=(program,rules,code,external)=>{const path=bestPath(rules.paths);results.push({id:program.slug??code,code,region:program.region,name:program.name,detail:program.detail??program.note,href:external?program.url:`/${program.slug}`,external:Boolean(external),fit:path.fit,met:path.met,path:path.name,checks:path.checks,notes:rules.notes??[],estimate:rules.estimate??null,preferred:f.wants(code)});};
 add(programs.find(p=>p.slug==='ee'),federal,'federal');
 // Provincial Express Entry streams require a federal profile, so they inherit the federal result.
 for(const pr of programs){const code=PROGRAM_CODES[pr.slug];if(!code)continue;const rules=provincial[code](f);
  for(const path of rules.paths)path.checks=path.checks.map(c=>c[0]==='Eligible for a federal Express Entry program'?[c[0],eePath.fit==='strong'?true:eePath.fit==='possible'?null:false]:c);
  add(pr,rules,code);}
 for(const u of unscored){const code=UNSCORED_CODES[u.region],rules=unscoredMatch(f,code);if(rules)add(u,rules,code,true);}
 return {results:results.sort((x,y)=>RANK[y.fit]-RANK[x.fit]||Number(y.preferred)-Number(x.preferred)||y.met-x.met),crs:federal.estimate.value};
}
