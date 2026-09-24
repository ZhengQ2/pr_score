// Rule snapshot: Saskatchewan Immigrant Nominee Program, International Skilled Worker point assessment grid
// ("Assess your eligibility" page), reviewed 2026-09-24. Maximum 110 points; 60 needed to apply.
import {lowestLevel,triValue,programResult} from './provincial-common.js';
const SINP='https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/';
export const sources={'SINP point assessment grid':SINP+'assess-your-eligibility','ISW EOI system':SINP+'browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-eoi-system','Occupations In-Demand':SINP+'browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-occupations-in-demand','Saskatchewan Express Entry':SINP+'browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-saskatchewan-express-entry'};
export const MAX_SCORE=110,MINIMUM=60;

export const subcategories=[['oid','Occupations In-Demand (no job offer, no Express Entry profile)'],['ee','Saskatchewan Express Entry (no job offer, Express Entry profile)'],['offer','Employment Offer (Saskatchewan job offer)']];
export const educationLevels=[['High school or less / none of the below',0],['Certificate or at least two semesters (less than a two-year program)',12],['Diploma requiring two (but less than three) years',15],['Trade certification equivalent to Saskatchewan journeyperson status',20],['Bachelor’s degree or at least a three-year degree',20],['Master’s or doctorate degree',23]];
export const recentExperience=[0,1,2,3,4,5].map(y=>[y,y===0?'Less than 1 year':`${y} year${y>1?'s':''}`,y*2]);
// The official grid lists 2–5 years (2–5 points) and "less than 1 year" (0) for years 6–10; it gives no row for 1 year.
export const olderExperience=[[0,'Less than 2 years',0],[2,'2 years',2],[3,'3 years',3],[4,'4 years',4],[5,'5 years',5]];
export const firstLanguagePoints=clb=>clb>=8?20:clb===7?18:clb===6?16:clb===5?14:clb===4?12:0;
export const secondLanguagePoints=clb=>clb>=8?10:clb===7?8:clb===6?6:clb===5?4:clb===4?2:0;
export const agePoints=age=>age<18?0:age<=21?8:age<=34?12:age<=45?10:age<=50?8:0;

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {subcategory:'oid',age:30,education:4,recentYears:0,olderYears:0,english:emptyLanguage(),french:emptyLanguage(),jobOffer:false,relative:false,pastWork:false,pastStudy:false,legalStatus:'unknown',relatedEducation:'unknown',skilledWork:'unknown',funds:'unknown',expressEntry:'unknown'};}
const section=(name,detail,max)=>({name,detail,max,points:Math.min(max,Object.values(detail).reduce((a,b)=>a+b,0))});
const lookup=(list,v)=>(list.find(x=>x[0]===Number(v))??list[0])[2];

export function calculate(p){
 const en=lowestLevel(p.english),fr=lowestLevel(p.french),firstIsFrench=fr>en;
 const [first,second]=firstIsFrench?[fr,en]:[en,fr];
 const offer=p.subcategory==='offer';
 const sections=[
  section('Education and training',{'Highest credential':(educationLevels[p.education]??educationLevels[0])[1]},23),
  section('Skilled work experience',{'Last 5 years':lookup(recentExperience,p.recentYears),'6–10 years ago':lookup(olderExperience,p.olderYears)},15),
  section('Language ability',{'First language test':firstLanguagePoints(first),'Second language test':secondLanguagePoints(second)},30),
  section('Age',{Age:agePoints(Number(p.age))},12),
  section('Saskatchewan connections',offer?{'High-skilled Saskatchewan job offer':p.jobOffer?30:0}:{'Close family relative in Saskatchewan':p.relative?20:0,'Past work in Saskatchewan':p.pastWork?5:0,'Past study in Saskatchewan':p.pastStudy?5:0},30)];
 return {total:sections.reduce((a,s)=>a+s.points,0),max:MAX_SCORE,sections,firstLanguage:!(p.english.tested||p.french.tested)?null:firstIsFrench?'French':'English'};
}

export function eligibility(p){
 const total=calculate(p).total,best=Math.max(lowestLevel(p.english),lowestLevel(p.french));
 const name=subcategories.find(s=>s[0]===p.subcategory)[1].split(' (')[0];
 const checks=[
  [`At least ${MINIMUM} of ${MAX_SCORE} points (you have ${total})`,total>=MINIMUM],
  ['CLB 4+ in all four abilities',best>=4],
  ['Post-secondary education or training related to your occupation (ECA if completed abroad)',triValue(p.relatedEducation)],
  ['1+ year of full-time skilled (TEER 0–3) work in the last 10 years, in an in-demand occupation, not excluded',triValue(p.skilledWork)],
  ['Living outside Canada or with legal status in Canada; not a refugee claimant',triValue(p.legalStatus)],
  ['Proof of settlement funds and a settlement plan',triValue(p.funds)]];
 if(p.subcategory==='ee')checks.push(['Valid Express Entry profile and job seeker validation code',triValue(p.expressEntry)]);
 if(p.subcategory==='offer')checks.push(['High-skilled job offer from a Saskatchewan employer',p.jobOffer]);
 return {programs:[programResult(p.subcategory.toUpperCase(),`International Skilled Worker · ${name}`,checks,p.subcategory==='ee'?sources['Saskatchewan Express Entry']:sources['Occupations In-Demand'])]};
}

// The official selection-results document was last updated 2024-09-12 and the SINP says no EOI draws are scheduled.
export const lastSelection={date:'2024-09-12',score:88,note:'Occupations In-Demand and Saskatchewan Express Entry, limited to selected occupations and candidates with an ECA or Canadian education.'};
