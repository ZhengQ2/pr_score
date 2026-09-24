// Rule snapshot: Alberta Advantage Immigration Program Worker Expression of Interest points grid
// (grid dated August 7, 2025, linked from alberta.ca/aaip-updates), reviewed 2026-09-24. Maximum 100 points.
import {lowestLevel,triValue,programResult} from './provincial-common.js';
import {provincialDraws} from './provincial-draws.js';
const AB='https://www.alberta.ca/';
export const sources={'Worker EOI points grid':AB+'system/files/im-worker-stream-expression-of-interest-points-grid.pdf','AAIP processing information and draws':AB+'aaip-processing-information','AAIP updates':AB+'aaip-updates','AAIP streams':AB+'aaip-application-streams'};
export const MAX_SCORE=100;

export const educationLevels=[['Secondary school or lower',0],['Diploma / certificate',4],['Trades certificate / diploma',7],['Bachelor’s degree',7],['Master’s degree',10],['Doctorate degree',12]];
export const educationLocations=[['abroad','Outside Canada',0],['canada','In Canada, outside Alberta',6],['alberta','In Alberta',10]];
export const totalExperience=[['lt6','Less than 6 months',3],['6-11','6 to 11 months',7],['12','12 months or more',11]];
export const canadaExperience=[['none','Less than 6 months in Canada',0],['other','6+ months in another province or territory',6],['alberta','6+ months in Alberta',10]];
export const offerLocations=[['metro','Calgary or Edmonton census metropolitan area',0],['rural','Rural Renewal Stream designated community',5],['other','Other Alberta community',5]];
export const englishPoints=clb=>clb>=6?10:clb===5?8:clb===4?5:0;
export const frenchPoints=clb=>clb>=6?8:clb===5?5:clb===4?3:0;
export const agePoints=age=>age<18?0:age<=20?3:age<=34?5:age<=49?4:3;

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {age:30,education:3,educationLocation:'abroad',english:emptyLanguage(),french:emptyLanguage(),totalExperience:'12',canadaExperience:'none',family:false,jobOffer:false,sectorOffer:false,offerLocation:'metro',regulated:false,streamEligible:'unknown',legalStatus:'unknown'};}
const pick=(list,v)=>(list.find(x=>x[0]===v)??list[0])[2];
const section=(name,detail,max)=>({name,detail,max,points:Math.min(max,Object.values(detail).reduce((a,b)=>a+b,0))});

export function calculate(p){
 const en=lowestLevel(p.english),fr=lowestLevel(p.french),e=englishPoints(en),f=frenchPoints(fr);
 const offer=p.jobOffer;
 const sections=[
  section('Education',{'Highest level completed':(educationLevels[p.education]??educationLevels[0])[1],'Completed in Canada':pick(educationLocations,p.educationLocation)},22),
  section('Language',{'General proficiency (higher of English / French)':Math.max(e,f),'Bilingual (CLB/NCLC 4+ in both)':p.english.tested&&p.french.tested&&en>=4&&fr>=4?3:0},13),
  section('Work experience',{'Total experience':pick(totalExperience,p.totalExperience),'Experience in Canada':pick(canadaExperience,p.canadaExperience)},21),
  section('Age',{Age:agePoints(Number(p.age))},5),
  section('Family in Alberta',{'Parent, child or sibling in Alberta':p.family?8:0},8),
  section('Alberta job offer',{'Permanent full-time job offer':offer?10:0,'Rural endorsement / tourism / law enforcement':offer&&p.sectorOffer?6:0,'Job offer location':offer?pick(offerLocations,p.offerLocation):0,'Regulated occupation with Alberta licence':offer&&p.regulated?10:0},31)];
 return {total:sections.reduce((a,s)=>a+s.points,0),max:MAX_SCORE,sections,firstLanguage:!(p.english.tested||p.french.tested)?null:f>e?'French':'English'};
}

export function eligibility(p){
 const ok4=l=>l.tested&&Math.min(...l.levels)>=4;
 return {programs:[programResult('WEOI','Worker Expression of Interest',[
  ['CLB/NCLC 4+ in all four abilities of one test (needed to submit a Worker EOI)',ok4(p.english)||ok4(p.french)],
  ['Meet the eligibility of at least one AAIP worker stream',triValue(p.streamEligible)],
  ['Valid immigration status if you are in Canada',triValue(p.legalStatus)]],sources['AAIP streams'])]};
}

// Recent scored rounds, refreshed from the official page by scripts/fetch-draws.mjs (see provincial-draws.js).
export const recentDraws=provincialDraws['aaip'];
