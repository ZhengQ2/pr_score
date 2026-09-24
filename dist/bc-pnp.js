// Rule snapshot: BC PNP Skills Immigration Program Guide, Part 8 Registration Scoring Factors
// (guide effective May 28 / June 10, 2026), reviewed 2026-09-24. Maximum registration score: 200.
import {lowestLevel,triValue,programResult} from './provincial-common.js';
import {provincialDraws} from './provincial-draws.js';
const WELCOME='https://www.welcomebc.ca/immigrate-to-b-c/';
export const sources={'Skills Immigration Program Guide':WELCOME+'bc-pnp-si-program-guide-pdf','BC PNP invitations to apply':WELCOME+'about-the-bc-provincial-nominee-program/invitations-to-apply','About the BC PNP':WELCOME+'about-the-bc-provincial-nominee-program'};
export const MAX_SCORE=200;

export const experienceOptions=[['No experience',0],['Less than 1 year',1],['At least 1 but less than 2 years',4],['At least 2 but less than 3 years',8],['At least 3 but less than 4 years',12],['At least 4 but less than 5 years',16],['5 or more years',20]];
export const educationLevels=[['Secondary school (high school) or less',0],['Post-secondary diploma / certificate (trades or non-trades)',5],['Associate degree',5],['Bachelor’s degree',15],['Post-graduate certificate or diploma',15],['Master’s degree',22],['Doctoral degree',27]];
export const educationLocations=[['abroad','Outside Canada',0],['canada','In Canada, outside B.C.',6],['bc','In B.C.',8]];
export const areas=[['1','Area 1 · Metro Vancouver Regional District',0],['2','Area 2 · Squamish, Abbotsford, Agassiz, Mission or Chilliwack',5],['3','Area 3 · Anywhere else in B.C.',15]];
export const languagePoints=clb=>clb>=9?30:clb===8?25:clb===7?20:clb===6?15:clb===5?10:clb===4?5:0;
// $16.00–$16.99 earns 1 point, rising 1 point per dollar to 55 points at $70.00 and above.
export const wagePoints=hourly=>hourly===null?0:Math.max(0,Math.min(55,Math.floor(hourly+1e-9)-15));
// Minimum family income (2024 LICO) by family size 1..7+: [Metro Vancouver, rest of B.C.].
export const minimumIncome=[[31264,26057],[38922,32437],[47851,39878],[58096,48418],[65892,54914],[74315,61935],[82739,68955]];
// Not eligible under any Skills Immigration stream (applications submitted after June 13, 2026).
export const ineligibleNocs={'12100':'Executive assistants','12101':'Human resources and recruitment officers','12200':'Accounting technicians and bookkeepers','13100':'Administrative officers','13110':'Administrative assistants','13111':'Legal administrative assistants','13112':'Medical administrative assistants','62010':'Retail sales supervisors','62020':'Food service supervisors','63101':'Real estate agents and salespersons','41302':'Religious leaders','42204':'Religious workers'};
export const ruralHealthNocs=['64410','65310','65312'];
export const isHealthAuthorityNoc=code=>/^3\d{4}$/.test(code??'')||['41300','41301','42201'].includes(code);

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {noc:null,nocTitle:'',teer:'unknown',experience:0,canadaExperience:false,currentEmployer:false,education:3,educationLocation:'abroad',designation:false,english:emptyLanguage(),french:emptyLanguage(),wageType:'hourly',wage:'',hours:40,area:'1',regionalBonus:false,familySize:1,spouseIncome:'',residence:'metro',jobOffer:'unknown',skilledExperience:'unknown',qualified:'unknown',legalStatus:'unknown',intention:'unknown',haSupport:'unknown',ruralWork:'unknown'};}

// Hourly wage for scoring: annual ÷ 52 ÷ weekly hours, with hours held between 30 and 40.
export function hourlyWage(p){
 const w=Number(p.wage);if(p.wage===''||!Number.isFinite(w)||w<=0)return null;
 if(p.wageType==='hourly')return w;
 return w/52/Math.min(40,Math.max(30,Number(p.hours)||40));
}
// Family income counts regular wages only, at no more than 40 hours/week × 52 weeks.
export function annualIncome(p){
 const hourly=hourlyWage(p);if(hourly===null)return null;
 const hours=Math.min(40,Number(p.hours)||40),spouse=Math.max(0,Number(p.spouseIncome)||0);
 return hourly*hours*52+spouse;
}

export function calculate(p){
 const en=lowestLevel(p.english),fr=lowestLevel(p.french),hourly=hourlyWage(p),postSecondary=p.education>=1;
 const experience={'Directly related experience':(experienceOptions[p.experience]??experienceOptions[0])[1],'1+ year directly related in Canada':p.canadaExperience?10:0,'Currently full-time with B.C. employer':p.currentEmployer?10:0};
 const education={'Highest level of education':(educationLevels[p.education]??educationLevels[0])[1],'Completed in B.C. / Canada':postSecondary?(educationLocations.find(l=>l[0]===p.educationLocation)??educationLocations[0])[2]:0,'B.C. professional designation':p.designation?5:0};
 const language={'English or French proficiency':languagePoints(Math.max(en,fr)),'Both English and French':p.english.tested&&p.french.tested&&en>=4&&fr>=4?10:0};
 const wage={'Hourly wage of B.C. job offer':wagePoints(hourly)};
 const area={'Area of employment':(areas.find(a=>a[0]===p.area)??areas[0])[2],'Regional experience or alumni':p.area!=='1'&&p.regionalBonus?10:0};
 const section=(name,detail,max)=>({name,detail,max,points:Math.min(max,Object.values(detail).reduce((a,b)=>a+b,0))});
 const sections=[section('Directly related work experience',experience,40),section('Education',education,40),section('Language',language,40),section('Hourly wage',wage,55),section('Area within B.C.',area,25)];
 return {total:sections.reduce((a,s)=>a+s.points,0),max:MAX_SCORE,sections,hourly,firstLanguage:!(p.english.tested||p.french.tested)?null:fr>en?'French':'English'};
}

export function eligibility(p){
 const teer=p.teer==='unknown'?null:Number(p.teer),best=Math.max(lowestLevel(p.english),lowestLevel(p.french));
 const income=annualIncome(p),need=minimumIncome[Math.min(7,Math.max(1,Number(p.familySize)||1))-1][p.residence==='metro'?0:1];
 const general=[
  ['Full-time, indeterminate job offer from a supporting, eligible B.C. employer',triValue(p.jobOffer)],
  ['Job offer is not an ineligible occupation',p.noc?!ineligibleNocs[p.noc]:null],
  [teer!==null&&teer<=1?'Language test not required for TEER 0/1 (optional for points)':'CLB 4+ in all four abilities (TEER 2–5)',teer===null?null:teer<=1?true:best>=4],
  [`Minimum family income: $${need.toLocaleString('en-CA')}${income===null?'':` (yours: $${Math.round(income).toLocaleString('en-CA')})`}`,income===null?null:income>=need],
  ['Qualified for the job, including any required licence or registration',triValue(p.qualified)],
  ['Legal status in Canada, if applicable, and admissible',triValue(p.legalStatus)],
  ['Intend to live in B.C.',triValue(p.intention)]];
 const guide=sources['Skills Immigration Program Guide'];
 return {income,minimumIncome:need,programs:[
  programResult('SW','Skilled Worker',[['Job offer in TEER 0, 1, 2 or 3',teer===null?null:teer<=3],['2 years of full-time skilled (TEER 0–3) experience in the last 10 years',triValue(p.skilledExperience)],...general],guide),
  programResult('HA','Health Authority',[['Eligible health occupation in TEER 0–3',p.noc?isHealthAuthorityNoc(p.noc)&&Number(p.noc[1])<=3:null],['Support from a B.C. public health authority',triValue(p.haSupport)],...general],guide),
  programResult('RRH','Rural/Remote Health Support Initiative',[['Security guard, light duty cleaner or janitor (NOC 64410, 65310, 65312)',p.noc?ruralHealthNocs.includes(p.noc):null],['9+ consecutive full-time months with the same health authority at an eligible rural/remote location',triValue(p.ruralWork)],['Support from a B.C. public health authority',triValue(p.haSupport)],...general],guide)]};
}

// Recent scored rounds, refreshed from the official page by scripts/fetch-draws.mjs (see provincial-draws.js).
export const recentDraws=provincialDraws['bc-pnp'];
