// Rule snapshot: Ontario Immigrant Nominee Program, Ontario Workforce Priority stream.
// Official page reviewed 2026-09-24 (page updated 2026-08-11). The June 26, 2026 redesign replaced the
// former employer job offer, Masters and PhD graduate EOI streams, so older OINP draw scores are not comparable.
import {lowestLevel,triValue,programResult,isOinpSkilledTrade} from './provincial-common.js';
import {provincialDraws} from './provincial-draws.js';
const OINP='https://www.ontario.ca/page/';
export const sources={'Ontario Workforce Priority stream':OINP+'ontario-workforce-priority-stream','OINP invitations':OINP+'ontario-immigrant-nominee-program-oinp-invitations-apply','OINP home':OINP+'ontario-immigrant-nominee-program-oinp','Ontario Regulation 422/17':'https://www.ontario.ca/laws/regulation/170422'};
export const MAX_SCORE=130;

export const teerPoints={0:9,1:9,2:6,3:6,4:0,5:0};
// Broad occupational category is the first digit of the five-digit NOC.
export const categoryPoints={3:10,7:8,2:6,0:4,1:4,4:4,8:4,9:4,5:2,6:2};
export const wageBands=[[40,15],[35,12],[30,10],[25,8],[20,5]];
export const monthBands=[['lt6','Less than 6 months / not currently working there'],['6-12','6 to 12 months'],['13-24','13 to 24 months'],['gt24','Over 24 months']];
const positionPoints={lt6:0,'6-12':12,'13-24':15,gt24:18},ontarioPoints={lt6:0,'6-12':6,'13-24':9,gt24:12};
export const earningsBands=[['lt30','Under $30,000',0],['30-49','$30,000 to $49,999',4],['50-69','$50,000 to $69,999',6],['70','$70,000 or more',8]];
export const statusOptions=[['none','No valid work or study permit',0],['study','Valid study permit',5],['work','Valid work permit',10]];
// [label, points, counts as 1+ year post-secondary for the TEER 0–3 non-trades education requirement]
export const educationLevels=[['Less than high school',0,false],['High school diploma',0,false],['Apprenticeship or trades certificate / diploma',5,true],['College, CEGEP or other non-university certificate / diploma',5,true],['University certificate / diploma below bachelor level',5,true],['Ontario College Graduate Certificate',5,true],['Bachelor’s degree or equivalent',6,true],['University certificate / diploma above bachelor level',6,true],['Master’s degree',8,true],['Doctorate, or degree in medicine, dentistry, veterinary medicine or optometry',10,true]];
export const credentialOptions=[[0,'No Canadian credential',0],[1,'One Canadian credential',5],[2,'More than one Canadian credential',10]];
export const regions=[['unknown','Select the job offer location',0],['north','Northern Ontario',15],['east','Eastern Ontario',10],['central','Central Ontario (outside the GTA)',10],['southwest','Southwestern Ontario',10],['gta','Inside the GTA (except Toronto)',5],['toronto','City of Toronto',0]];
export const languagePoints=clb=>clb>=9?15:clb===8?12:clb===7?8:clb===6?4:0;

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {path:'job',noc:null,nocTitle:'',teer:'unknown',category:'unknown',skilledTrade:false,wage:'',positionMonths:'lt6',ontarioMonths:'lt6',physicianMonths:'lt6',earnings:'lt30',status:'none',education:6,credentials:0,english:emptyLanguage(),french:emptyLanguage(),region:'unknown',jobOffer:'unknown',workExperience:'unknown',recentGrad:false,legalStatus:'unknown',intention:'unknown',physicianLicence:'unknown'};}

// Self-employed physicians are prepopulated as NOC 31100–31102: TEER 1, broad category 3.
const effectiveTeer=p=>p.path==='physician'?1:p.teer==='unknown'?null:Number(p.teer);
const effectiveCategory=p=>p.path==='physician'?3:p.category==='unknown'?null:Number(p.category);
export const wagePoints=wage=>{const w=Number(wage);if(wage===''||!Number.isFinite(w))return 0;return (wageBands.find(([min])=>w>=min)??[0,0])[1];};
const lookup=(list,value)=>(list.find(item=>String(item[0])===String(value))??[0,'',0])[2];

export function calculate(p){
 const teer=effectiveTeer(p),category=effectiveCategory(p),physician=p.path==='physician';
 const inPosition=positionPoints[p.positionMonths]??0;
 const work=physician?(positionPoints[p.physicianMonths]??0):inPosition>0?inPosition:(ontarioPoints[p.ontarioMonths]??0);
 const en=lowestLevel(p.english),fr=lowestLevel(p.french);
 const employment={'NOC TEER category':teer===null?0:teerPoints[teer],'Broad occupational category':category===null?0:categoryPoints[category],'Hourly wage':physician?0:wagePoints(p.wage),[physician?'Ontario medical practice':inPosition>0?'Time in job offer position':'Ontario work experience']:work,'Earnings history':lookup(earningsBands,p.earnings),'Legal status in Canada':lookup(statusOptions,p.status)};
 const education={'Highest level of education':(educationLevels[p.education]??educationLevels[0])[1],'Canadian credentials':lookup(credentialOptions,p.credentials)};
 const anyLanguage=p.english.tested||p.french.tested;
 const language={'Official language ability':languagePoints(Math.max(en,fr)),'Knowledge of official languages':p.english.tested&&p.french.tested&&en>=6&&fr>=6?10:anyLanguage?5:0};
 const regional={'Regional immigration':lookup(regions,p.region)};
 const section=(name,detail,max)=>({name,detail,max,points:Object.values(detail).reduce((a,b)=>a+b,0)});
 const sections=[section('Employment / labour market',employment,70),section('Education',education,20),section('Language',language,25),section('Regionalization',regional,15)];
 return {total:sections.reduce((a,s)=>a+s.points,0),max:MAX_SCORE,sections,firstLanguage:!anyLanguage?null:fr>en?'French':'English'};
}

export function languageRequirement(p){
 const teer=effectiveTeer(p);if(teer===null)return null;
 if(teer>=4)return 4;
 return p.skilledTrade?5:6;
}

export function eligibility(p){
 const best=Math.max(lowestLevel(p.english),lowestLevel(p.french)),teer=effectiveTeer(p);
 if(p.path==='physician')return {programs:[programResult('OWP-P','Workforce Priority · self-employed physician',[
  ['OHIP billing number and a qualifying CPSO certificate of registration',triValue(p.physicianLicence)],
  ['Intend to live and work in Ontario',triValue(p.intention)]],sources['Ontario Workforce Priority stream'])]};
 const need=languageRequirement(p),skilled=teer!==null&&teer<=3;
 const eduOk=p.education===undefined?null:skilled&&!p.skilledTrade?educationLevels[p.education][2]:p.education>=1;
 return {programs:[programResult('OWP','Ontario Workforce Priority · job offer',[
  ['Full-time, permanent Ontario job offer from an eligible employer',triValue(p.jobOffer)],
  ['Job offer NOC identified',teer===null?null:true],
  [teer===null?'Work experience (depends on TEER)':skilled?'6 months in the position (3 if a recent Ontario graduate), 2 years in the same NOC, or a mandatory licence':'9 months cumulative full-time in the position within 2 years',teer===null?null:triValue(p.workExperience)],
  [need===null?'Language: CLB 4–6 depending on the job offer':`CLB ${need}+ in all four abilities${skilled?' (or a recent Ontario graduate exemption)':''}`,need===null?null:skilled&&p.recentGrad?true:best>=need],
  [skilled&&!p.skilledTrade?'Post-secondary credential of at least one academic year (Canadian or with ECA)':'High school diploma or equivalent',teer===null?null:eduOk],
  ['Legal status if applying from within Canada',p.status!=='none'?true:triValue(p.legalStatus)],
  ['Intend to live and work in Ontario',triValue(p.intention)]],sources['Ontario Workforce Priority stream'])]};
}

export {isOinpSkilledTrade};
// Workforce Priority rounds only (earlier streams used other grids); empty until Ontario publishes one.
export const recentDraws=provincialDraws.oinp;
