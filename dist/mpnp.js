// Rule snapshot: Manitoba Provincial Nominee Program Expression of Interest ranking system (Skilled Worker and
// International Education streams), from immigratemanitoba.com/mpnp/apply/eoi, reviewed 2026-09-24. Maximum 1,000.
import {lowestLevel,triValue,programResult} from './provincial-common.js';
import {provincialDraws} from './provincial-draws.js';
const MB='https://immigratemanitoba.com/';
export const sources={'EOI ranking system':MB+'mpnp/apply/eoi/','EOI draws':MB+'draws/','Skilled Worker Stream':MB+'mpnp/skilled-worker/'};
export const MAX_SCORE=1000;

// First official language: points per ability band (listening, speaking, reading, writing).
export const bandPoints=clb=>clb>=8?25:clb===7?22:clb===6?20:clb===5?17:clb===4?12:0;
export const agePoints=age=>age<18?0:age===18?20:age===19?30:age===20?40:age<=45?75:age===46?40:age===47?30:age===48?20:age===49?10:0;
export const experienceOptions=[[0,'Less than one year',0],[1,'One year',40],[2,'Two years',50],[3,'Three years',60],[4,'Four years or more',75]];
export const educationLevels=[['No formal post-secondary education',0],['Trade certificate',70],['One-year post-secondary program',70],['One post-secondary program of two years',100],['One post-secondary program of three years or more',110],['Two post-secondary programs of at least two years each',115],['Master’s degree or doctorate',125]];
export const connections=[['none','No connection',0],['relative','Close relative in Manitoba',200],['work','Previous authorized work in Manitoba (6+ months)',100],['study2','Completed a 2+ year post-secondary program in Manitoba',100],['study1','Completed a 1-year post-secondary program in Manitoba',50],['friend','Close friend or distant relative in Manitoba',50]];
export const demandOptions=[['none','Neither',0],['employment','Working in Manitoba 6+ months with a long-term offer from the same employer',500],['strategic','Invitation to Apply under an MPNP strategic initiative',500]];

const emptyLanguage=()=>({test:'',scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false});
export function defaults(){return {age:30,english:emptyLanguage(),french:emptyLanguage(),experience:0,licensed:false,education:4,connection:'none',demand:'none',regional:false,workOther:false,studyOther:false,pathway:'unknown',intention:'unknown'};}
const pick=(list,v)=>(list.find(x=>String(x[0])===String(v))??list[0])[2];

export function calculate(p){
 const perBand=l=>l.tested?l.levels.reduce((a,x)=>a+bandPoints(x),0):0;
 const en=perBand(p.english),fr=perBand(p.french),firstIsFrench=fr>en;
 const second=firstIsFrench?p.english:p.french;
 const conn=pick(connections,p.connection),demand=pick(demandOptions,p.demand);
 // Regional development points combine with another connection, never with Manitoba Demand.
 const adaptability=demand?{'Manitoba demand':demand}:{'Connection to Manitoba':conn,'Settling outside Winnipeg':conn&&p.regional?50:0};
 const risk={'Work experience in another province':p.workOther?-100:0,'Studies in another province':p.studyOther?-100:0};
 const section=(name,detail,max,min=0)=>({name,detail,max,points:Math.max(min,Math.min(max,Object.values(detail).reduce((a,b)=>a+b,0)))});
 const sections=[
  section('Language proficiency',{'First official language (per ability)':Math.max(en,fr),'Second official language CLB 5+':lowestLevel(second)>=5?25:0},125),
  section('Age',{Age:agePoints(Number(p.age))},75),
  section('Work experience',{'Full years in the last 5 years':pick(experienceOptions,p.experience),'Fully recognized by a Manitoba licensing body':p.licensed?100:0},175),
  section('Education',{'Highest completed education':(educationLevels[p.education]??educationLevels[0])[1]},125),
  section('Adaptability',adaptability,500),
  section('Risk assessment',risk,0,-200)];
 const total=sections.reduce((a,s)=>a+s.points,0);
 return {total,max:MAX_SCORE,sections,firstLanguage:!(p.english.tested||p.french.tested)?null:firstIsFrench?'French':'English'};
}

export function eligibility(p){
 return {programs:[programResult('SW','Skilled Worker Stream · EOI',[
  ['At least one connection to Manitoba (all candidates need one)',p.connection!=='none'||p.demand!=='none'],
  ['Valid language test from an approved provider (taken in the last 2 years)',p.english.tested||p.french.tested],
  ['Meet the requirements of your pathway (Skilled Worker in Manitoba or Overseas)',triValue(p.pathway)],
  ['Intend to live and work in Manitoba',triValue(p.intention)]],sources['Skilled Worker Stream'])]};
}

// Recent scored rounds, refreshed from the official page by scripts/fetch-draws.mjs (see provincial-draws.js).
export const recentDraws=provincialDraws['mpnp'];
