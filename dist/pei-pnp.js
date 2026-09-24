// Rule snapshot: PEI Workforce Application Guide (January 2026), Appendix A Labour Points Grid and Appendix B
// Express Entry Points Grid, reviewed 2026-09-24. Every stream totals 100; each area is capped at its stream maximum.
import {lowestLevel,triValue,programResult} from './provincial-common.js';
const PEI='https://www.princeedwardisland.ca/';
export const sources={'PEI Workforce Application Guide':PEI+'sites/default/files/publications/pei_workforce_application_guide.pdf','Expression of Interest draws':PEI+'en/information/office-of-immigration/expression-of-interest-draws','Submit an EOI profile':PEI+'en/service/submit-your-expression-of-interest-profile'};
export const MAX_SCORE=100;

export const streams=[['sw-pei','Skilled Worker · in PEI'],['sw-out','Skilled Worker · outside Canada'],['critical','Critical Worker'],['ig','International Graduate'],['ie','Intermediate Experience'],['oid','Occupations in Demand'],['ee-offer','PEI Express Entry · with a job offer'],['ee-none','PEI Express Entry · without a job offer']];
export const isExpressEntry=s=>s.startsWith('ee-');
const isSkilled=s=>s==='sw-pei'||s==='sw-out';
// Area maxima per stream: [age, language, education, work experience, employment, adaptability].
const MAXIMA={'sw-pei':[15,20,15,20,15,15],'sw-out':[15,20,15,20,15,15],critical:[15,20,15,20,15,15],ig:[25,0,35,0,20,20],ie:[15,20,15,20,15,15],oid:[15,20,15,20,15,15],'ee-offer':[20,20,15,15,15,15],'ee-none':[20,20,15,20,10,15]};

export const educationLevels=[['none','Less than secondary school'],['secondary','Completion of secondary school'],['diploma','Post-secondary diploma (1+ year; 2+ year trade diploma for Express Entry)'],['bachelor','Bachelor’s degree (3+ years of study)'],['masters','Master’s or PhD after a bachelor’s or master’s degree']];
const EDUCATION={sw:{masters:15,bachelor:12,diploma:10},critical:{masters:15,bachelor:12,diploma:10,secondary:10},ig:{masters:35,bachelor:20,diploma:20},ie:{masters:15,bachelor:15,diploma:15,secondary:15},oid:{masters:15,bachelor:15,diploma:15,secondary:15},ee:{masters:15,bachelor:12,diploma:10,secondary:0}};
export const experienceOptions=[['lt1','Less than 1 year'],['1-2','1 to 2 years'],['2-4','2 to 4 years'],['4-6','4 to 6 years'],['6+','More than 6 years']];
const EXPERIENCE={labour:{'2-4':10,'4-6':15,'6+':20},'ee-offer':{'1-2':5,'2-4':10,'4-6':15,'6+':15},'ee-none':{'1-2':5,'2-4':10,'4-6':15,'6+':20}};
// Employment factors and their points in each stream (absent = not available in that stream).
export const employmentFactors=[
 ['permanentPei','Working in a permanent position in PEI with a valid work permit',{'sw-pei':5,critical:5,ig:5,ie:5,'ee-offer':5}],
 ['offerEducation','Job offer in PEI related to your education',{'sw-pei':10,'sw-out':10,critical:10,ig:10,'ee-offer':5}],
 ['qualification','Foreign qualification verified by the PEI regulatory body (not an ECA)',{'sw-pei':5,'sw-out':5,critical:5,ig:5,ie:5,oid:5,'ee-offer':5,'ee-none':5}],
 ['yearInPei','At least 1 year of continuous full-time work in PEI',{'sw-pei':5,'sw-out':5,critical:5,ig:5,ie:5,'ee-offer':5,'ee-none':5}],
 ['offerExperience','Job offer in PEI related to your experience',{ie:5,oid:10}],
 ['lmia','Previous work experience gained through an LMIA',{ie:5}]];
export const adaptabilityFactors=[
 ['family','Close family in PEI for 12+ consecutive months (citizens or permanent residents)',null],
 ['spouseLanguage','Spouse/partner and/or dependent children have CLB/NCLC 6+ in English or French',null],
 ['property','Own residential property in PEI for 12+ consecutive months',['sw-pei','sw-out','critical','ig','ee-offer','ee-none']],
 ['peiGraduate','Graduated from a recognized PEI post-secondary institution',null],
 ['spouseWork','Spouse/partner has 3+ years of work experience in the last 5 years',null],
 ['childrenSchool','Dependent children enrolled in a PEI educational institution for 6+ continuous months',['sw-pei','sw-out','critical']]];
export const availableAdaptability=(stream,factor)=>!factor[2]||factor[2].includes(stream);
export const labourLanguagePoints=clb=>clb>=9?20:clb===8?17:clb===7?15:clb===6?10:clb===5?5:0;
export const eeLanguagePoints=clb=>clb>=9?20:clb===8?15:clb===7?10:0;
export function agePoints(age,stream){
 if(age<18||age>49)return 0;
 if(isExpressEntry(stream))return age<=24?7:age<=29?20:age<=44?15:10;
 if(stream==='ig')return age<=24?10:age<=44?25:15;
 return age<=24?7:age<=44?15:10;
}

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {stream:'sw-out',age:30,english:emptyLanguage(),french:emptyLanguage(),employerForm:false,education:'bachelor',experience:'2-4',...Object.fromEntries([...employmentFactors,...adaptabilityFactors].map(([k])=>[k,false])),streamEligible:'unknown',intention:'unknown',expressEntry:'unknown'};}
const section=(name,detail,max)=>({name,detail,max,points:Math.min(max,Object.values(detail).reduce((a,b)=>a+b,0))});

export function calculate(p){
 const s=p.stream,ee=isExpressEntry(s),[ageMax,langMax,eduMax,expMax,empMax,adaptMax]=MAXIMA[s];
 const en=lowestLevel(p.english),fr=lowestLevel(p.french);
 // Labour streams award each language separately up to the area maximum; Express Entry scores the better test.
 const language=ee?{'Language test (better of English / French)':eeLanguagePoints(Math.max(en,fr))}:{'English test':labourLanguagePoints(en),'French test':labourLanguagePoints(fr),...(isSkilled(s)?{'Employer-signed PEIW-02 Job Offer Form':p.employerForm?20:0}:{})};
 const eduTable=ee?EDUCATION.ee:isSkilled(s)?EDUCATION.sw:EDUCATION[s];
 const expTable=ee?EXPERIENCE[s]:EXPERIENCE.labour;
 const employment=Object.fromEntries(employmentFactors.filter(f=>f[2][s]).map(([k,label,pts])=>[label,p[k]?pts[s]:0]));
 const adaptability=Object.fromEntries(adaptabilityFactors.filter(f=>availableAdaptability(s,f)).map(([k,label])=>[label,p[k]?5:0]));
 const sections=[
  section('Age',{Age:agePoints(Number(p.age),s)},ageMax),
  ...(langMax?[section('Language',language,langMax)]:[]),
  section('Education',{'Highest level completed':eduTable[p.education]??0},eduMax),
  ...(expMax?[section('Work experience',{'Full-time work experience':expTable[p.experience]??0},expMax)]:[]),
  section('Employment',employment,empMax),
  section('Adaptability',adaptability,adaptMax)];
 return {total:sections.reduce((a,x)=>a+x.points,0),max:MAX_SCORE,sections,firstLanguage:!(p.english.tested||p.french.tested)?null:fr>en?'French':'English'};
}

export function eligibility(p){
 const name=streams.find(s=>s[0]===p.stream)[1];
 const checks=[['Meet the stream requirements in the PEI Workforce Application Guide',triValue(p.streamEligible)],['Intend to live and work in Prince Edward Island',triValue(p.intention)]];
 if(isExpressEntry(p.stream))checks.unshift(['Valid federal Express Entry profile',triValue(p.expressEntry)]);
 return {programs:[programResult(p.stream,name,checks,sources['PEI Workforce Application Guide'])]};
}
