// Declarative forms for the provincial calculators: sections of fields plus page copy and a results context.
// Rules live in each province's module; this file only describes how to ask for the inputs.
import * as oinp from './oinp.js';
import * as bc from './bc-pnp.js';
import * as aaip from './aaip.js';
import * as sinp from './sinp.js';
import * as mpnp from './mpnp.js';
import * as pei from './pei-pnp.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEERS=[['unknown','Select an occupation or TEER'],...[0,1,2,3,4,5].map(t=>[String(t),`TEER ${t}`])];
const withPoints=list=>list.map(([v,l,pts])=>[v,`${l} · ${pts} pts`]);
const indexed=list=>list.map(([l,pts],i)=>[i,`${l} · ${pts} pts`]);
const LANGUAGES=[{type:'language',key:'english',title:'English'},{type:'language',key:'french',title:'French'}];
const AGE={type:'number',key:'age',label:'Age',min:0,max:100,step:1,hint:'Your age when you submit your expression of interest.'};
// Cards comparing the score with published minimums; targeted rounds need more than the score.
function drawCards(draws,total,note){
 return draws.rounds.map(r=>{const met=total>=r.score;return `<article class="draw-card ${met?'pass':'fail'}"><h3>${esc(r.label)}</h3>${r.detail?`<p class="draw-detail">${esc(r.detail)}</p>`:''}<div class="draw-meta"><div><b>${r.date}</b><span>Draw date</span></div><div><b>${r.score}</b><span>Minimum score</span></div><div><b>${r.size}</b><span>Invitations</span></div></div><p>${met?`Your score of ${total} meets this minimum.`:`${r.score-total} points below this minimum.`}</p></article>`;}).join('')+`<p class="hint wide-note">${note} ${draws.updated?`Official page updated ${draws.updated}.`:''} <a href="${draws.url}" target="_blank" rel="noopener">Latest official draws ↗</a></p>`;
}

export const FORMS={
 oinp:{
  eyebrow:'Ontario · OINP',title:'Estimate your Ontario Workforce Priority score.',
  intro:'The Ontario Immigrant Nominee Program ranks expressions of interest out of 130 points. Enter your job offer, experience, education and language results to see your score and screen the stream requirements.',
  reviewed:'Rules reviewed September 24, 2026 (Ontario page updated August 11, 2026).',
  sections:[
   {id:'sec-offer',nav:'Job offer',title:'Your job offer',intro:'Points for occupation, wage and region come from the job offer your employer submits. Self-employed physicians use their Ontario practice instead.',fields:[
    {type:'select',key:'path',label:'How are you applying?',wide:true,options:[['job','With a job offer from an Ontario employer'],['physician','As a self-employed physician (OHIP billing number)']]},
    {type:'noc',show:p=>p.path==='job'},
    {type:'select',key:'teer',label:'TEER category of the job offer',show:p=>p.path==='job',options:TEERS,hint:'The second digit of the five-digit NOC. Set automatically when you pick an occupation.'},
    {type:'select',key:'category',label:'Broad occupational category',show:p=>p.path==='job',options:[['unknown','Select an occupation or category'],['0','0 · Legislative and senior management'],['1','1 · Business, finance and administration'],['2','2 · Natural and applied sciences'],['3','3 · Health'],['4','4 · Education, law, social, community and government'],['5','5 · Art, culture, recreation and sport'],['6','6 · Sales and service'],['7','7 · Trades, transport and equipment operators'],['8','8 · Natural resources and agriculture'],['9','9 · Manufacturing and utilities']],hint:'The first digit of the NOC.'},
    {type:'check',key:'skilledTrade',label:'The job offer is a listed skilled trade',show:p=>p.path==='job',hint:'NOC major groups 72 (not 726), 73, 82, 83, 93 (not 932), minor group 6320 or unit 62200. Lowers the language requirement to CLB 5 and the education requirement to high school.'},
    {type:'number',key:'wage',label:'Hourly wage in the job offer (CAD)',show:p=>p.path==='job',min:0,step:0.01,placeholder:'e.g. 32.50',hint:'Hourly rate before tax. For a salary, divide the annual amount by the yearly hours.'},
    {type:'select',key:'region',label:p=>p.path==='job'?'Work location in the job offer':'Ontario practice address',options:oinp.regions.map(([v,l,pts])=>[v,v==='unknown'?l:`${l} · ${pts} pts`]),wide:true,hint:'Northern: Muskoka, Haliburton, Nipissing, Parry Sound, Manitoulin, Sudbury, Timiskaming, Cochrane, Algoma, Thunder Bay, Rainy River, Kenora. GTA: Durham, Halton, Peel, York.'}]},
   {id:'sec-experience',nav:'Experience',title:'Experience and status',intro:'Ontario scores time in the job offer position first; Ontario work in other roles only counts if you have less than 6 months in the position.',fields:[
    {type:'select',key:'positionMonths',label:'Full-time work in the job offer position',show:p=>p.path==='job',options:oinp.monthBands},
    {type:'select',key:'ontarioMonths',label:'Other full-time (or part-time equivalent) work in Ontario',show:p=>p.path==='job'&&p.positionMonths==='lt6',options:oinp.monthBands},
    {type:'select',key:'physicianMonths',label:'Cumulative medical practice in Ontario',show:p=>p.path==='physician',options:oinp.monthBands},
    {type:'select',key:'earnings',label:'Highest Canadian earnings in one year',options:oinp.earningsBands.map(([v,l])=>[v,l]),hint:'From a CRA Notice of Assessment issued in the last 5 years.'},
    {type:'select',key:'status',label:'Current legal status in Canada',options:oinp.statusOptions.map(([v,l])=>[v,l]),hint:'The permit must confer legal status.'}]},
   {id:'sec-education',nav:'Education',title:'Education',intro:'A Canadian credential or an Educational Credential Assessment (ECA) is required for education points.',fields:[
    {type:'select',key:'education',label:'Highest level of education',wide:true,options:oinp.educationLevels.map(([l],i)=>[i,l])},
    {type:'select',key:'credentials',label:'Canadian education credentials',wide:true,options:oinp.credentialOptions.map(([v,l])=>[v,l])}]},
   {id:'sec-language',nav:'Language',title:'Language test results',intro:'Ontario scores the lowest CLB/NCLC of your four abilities, using the better of English or French. Two languages at CLB 6+ earn a 10-point bonus.',fields:[{type:'language',key:'english',title:'English'},{type:'language',key:'french',title:'French'}]},
   {id:'sec-eligibility',nav:'Eligibility',title:'Stream requirements',intro:'Scoring factors are not the same as stream criteria. Answer these to screen the Workforce Priority requirements.',fields:[
    {type:'tri',key:'jobOffer',show:p=>p.path==='job',label:'Is the offer full-time and permanent, from an employer that meets OINP requirements?',hint:'3+ years in active business, Ontario premises, revenue and Canadian/PR staff minimums by location, and prevailing wage. Ontario Public Service employers do not participate.'},
    {type:'tri',key:'workExperience',show:p=>p.path==='job',label:'Do you meet the work experience requirement for your TEER?',hint:'TEER 0–3: 6 consecutive months full-time in the position within the last 12 months (3 months for recent Ontario graduates), OR 2 years cumulative in the same NOC within 5 years, OR a mandatory licence. Truck and bus drivers always need 6 months. TEER 4–5: 9 months cumulative full-time in the position within 2 years.'},
    {type:'check',key:'recentGrad',show:p=>p.path==='job'&&p.teer!=='4'&&p.teer!=='5',label:'Recent Ontario graduate (language test exemption)',hint:'Within the last 3 years from an eligible Ontario institution: a 2-year+ degree or diploma, Ontario College Graduate Certificate, master’s or PhD.'},
    {type:'tri',key:'legalStatus',show:p=>p.path==='job'&&p.status==='none',label:'If you are in Canada, do you have valid visitor status or maintained status?',hint:'Choose Yes if you are applying from outside Canada.'},
    {type:'tri',key:'physicianLicence',show:p=>p.path==='physician',label:'Do you hold an OHIP billing number and a CPSO certificate for independent, academic or provisional practice?',hint:'A postgraduate education licence does not qualify for the self-employed route.'},
    {type:'tri',key:'intention',label:'Do you intend to live and work in Ontario?'}]}],
  context(result){const draws=oinp.recentDraws;if(draws?.rounds.length)return drawCards(draws,result.total,'Workforce Priority rounds may target regions, occupations or other criteria.');return `<article class="draw-card muted"><h3>Invitation rounds</h3><p>As of the latest update to Ontario’s invitations page (${draws?.updated??'August 11, 2026'}), no rounds have been published for the Workforce Priority stream yet. Earlier OINP rounds used the old 8-stream grids, so their cut-offs aren’t comparable to this score.</p><a href="${oinp.sources['OINP invitations']}" target="_blank" rel="noopener">Check OINP invitations ↗</a></article><article class="draw-card"><h3>Express Entry option</h3><p>TEER 0–3 applicants in an Express Entry pool can ask to be nominated through Express Entry. An accepted nomination adds 600 CRS points.</p><a href="/ee" data-route>Open the CRS calculator</a></article>`;},
  note:'Provincial nominations are subject to Ontario’s annual allocation. Scores rank expressions of interest; only invited candidates can apply.'},
 'bc-pnp':{
  eyebrow:'British Columbia · BC PNP',title:'Estimate your BC PNP Skills Immigration score.',
  intro:'The BC PNP scores Skills Immigration registrations out of 200 points: 120 for human capital and 80 for economic factors. See your registration score and screen the Skilled Worker and Health Authority streams.',
  reviewed:'Rules reviewed September 24, 2026 (program guide effective June 10, 2026).',
  sections:[
   {id:'sec-offer',nav:'Job offer',title:'Your B.C. job offer',intro:'Wage and location points come from your full-time job offer.',fields:[
    {type:'noc'},
    {type:'select',key:'teer',label:'TEER category of the job offer',options:TEERS,hint:'Set automatically when you pick an occupation.'},
    {type:'select',key:'wageType',label:'Wage stated as',options:[['hourly','An hourly rate'],['annual','An annual salary']]},
    {type:'number',key:'wage',label:p=>p.wageType==='hourly'?'Hourly wage (CAD)':'Annual salary (CAD)',min:0,step:p=>p.wageType==='hourly'?0.01:1,placeholder:p=>p.wageType==='hourly'?'e.g. 38.50':'e.g. 85000',hint:'Base pay only: no bonuses, commissions, tips, overtime or allowances.'},
    {type:'number',key:'hours',label:'Hours per week',min:1,max:80,step:0.5,hint:'Wage points use 30–40 hours; family income counts at most 40.'},
    {type:'select',key:'area',label:'Main work location',wide:true,options:bc.areas.map(([v,l,pts])=>[v,`${l} · ${pts} pts`]),hint:'Where you regularly report to work, or your home address if you work from home.'},
    {type:'check',key:'regionalBonus',show:p=>p.area!=='1',label:'Regional experience or regional alumni (+10)',hint:'1+ year full-time paid work outside Metro Vancouver in the last 5 years, OR graduated in the last 3 years from a public B.C. post-secondary institution outside Metro Vancouver (8+ months, attended while living outside Metro Vancouver).'}]},
   {id:'sec-experience',nav:'Experience',title:'Directly related work experience',intro:'Experience in the same NOC as your job offer (or a directly related one at the same or higher TEER) in the last 10 years. Part-time counts at 50%. Work on a study permit only counts for paid, full-time co-op terms after graduation.',fields:[
    {type:'select',key:'experience',label:'Directly related experience',wide:true,options:bc.experienceOptions.map(([l,pts],i)=>[i,`${l} · ${pts} pts`])},
    {type:'check',key:'canadaExperience',label:'At least 1 year of that experience in Canada (+10)',hint:'With a Canadian employer while authorized to work: 12 months at 30+ hours/week, or 24 months below 30 hours/week.'},
    {type:'check',key:'currentEmployer',label:'Currently working full-time in B.C. for this employer in this NOC (+10)',hint:'Not available if the offer is a promotion from your current role or the work is unpaid.'}]},
   {id:'sec-education',nav:'Education',title:'Education',intro:'Only your highest completed credential counts. Programs must be longer than 6 months; Canadian distance education doesn’t count.',fields:[
    {type:'select',key:'education',label:'Highest completed education',wide:true,options:bc.educationLevels.map(([l,pts],i)=>[i,`${l} · ${pts} pts`]),hint:'Post-graduate certificates require a bachelor’s degree for admission.'},
    {type:'select',key:'educationLocation',show:p=>p.education>=1,label:'Where was that credential completed?',wide:true,options:bc.educationLocations.map(([v,l,pts])=>[v,`${l}${pts?` · +${pts} pts`:''}`]),hint:'Language-training and distance programs don’t qualify for the B.C./Canada bonus.'},
    {type:'check',key:'designation',label:'Eligible B.C. professional designation (+5)',hint:'For the job offered: SkilledTradesBC certificate or registered apprentice (any trade, incl. Red Seal), or B.C. registration as a dental assistant, hygienist, technician or denturist, ECE (One/Five Year), health care aide, pharmacy technician, practical nurse, TCM practitioner/acupuncturist, or veterinary technician.'}]},
   {id:'sec-language',nav:'Language',title:'Language test results',intro:'B.C. scores the lowest CLB/NCLC of your four abilities, using the better of English or French. Both languages at CLB 4+ earn 10 more points.',fields:[{type:'language',key:'english',title:'English'},{type:'language',key:'french',title:'French'}]},
   {id:'sec-eligibility',nav:'Eligibility',title:'Stream requirements',intro:'The Skilled Worker and Rural/Remote Health streams use this registration score. The Health Authority stream doesn’t need a registration; you apply directly.',fields:[
    {type:'tri',key:'jobOffer',label:'Is your offer full-time (30+ hours/week), indeterminate, from a B.C. employer that supports your application?',hint:'Some tech, teaching and university occupations can use a limited-term offer of 1+ year.'},
    {type:'tri',key:'skilledExperience',label:'Skilled Worker: 2+ years of full-time skilled (TEER 0–3) experience in the last 10 years?',hint:'Any skilled occupation, in Canada or abroad. Separate from the directly related experience scored above.'},
    {type:'tri',key:'haSupport',show:p=>!p.noc||bc.isHealthAuthorityNoc(p.noc)||bc.ruralHealthNocs.includes(p.noc),label:'Do you have the support of a B.C. public health authority?',hint:'Needed for the Health Authority stream and the Rural/Remote Health initiative.'},
    {type:'tri',key:'ruralWork',show:p=>!p.noc||bc.ruralHealthNocs.includes(p.noc),label:'Rural/Remote Health: 9+ consecutive full-time months with that health authority at an eligible rural or remote location?',hint:'Not eligible in Metro Vancouver, Central Okanagan or the Capital Regional District (except Galiano, Mayne, Pender, Salt Spring and Saturna islands).'},
    {type:'tri',key:'qualified',label:'Are you qualified for the job, including any required licence or registration?'},
    {type:'tri',key:'legalStatus',label:'Are you admissible and, if in Canada, in status and authorized for your work?'},
    {type:'tri',key:'intention',label:'Do you intend to live in B.C.?'},
    {type:'select',key:'familySize',label:'Family size',options:[1,2,3,4,5,6,7].map(n=>[n,n===7?'7 or more':String(n)]),hint:'You, your spouse and dependent children, even if they won’t come to B.C. Exclude Canadian citizens and PRs.'},
    {type:'select',key:'residence',label:'Where you will live',options:[['metro','Metro Vancouver'],['rest','Elsewhere in B.C.']]},
    {type:'number',key:'spouseIncome',label:'Spouse’s regular annual B.C. income (optional)',min:0,step:1,placeholder:'0',wide:true,hint:'Counts only if your spouse has a valid work permit and is currently employed in B.C.'}]}],
  context:result=>drawCards(bc.recentDraws,result.total,'Targeted rounds only invite registrations in priority occupations for that category, and wage-based rounds invite by wage instead of score.'),
  note:'Registrations stay in the pool for 12 months. An invitation is not a nomination; the BC PNP verifies every claimed point.'},
 aaip:{
  eyebrow:'Alberta · AAIP',title:'Estimate your Alberta Worker EOI score.',
  intro:'The Alberta Advantage Immigration Program scores Worker Expressions of Interest out of 100: 69 for human capital and 31 for an Alberta job offer. Draws also select by occupation, sector and program priorities.',
  reviewed:'Rules reviewed September 24, 2026 (points grid dated August 7, 2025).',
  sections:[
   {id:'sec-about',nav:'About you',title:'About you',intro:'Age and family connections are human capital factors.',fields:[AGE,
    {type:'check',key:'family',label:'Parent, child or sibling living in Alberta (+8)',hint:'Canadian citizen or permanent resident aged 18+. In-laws don’t count.'}]},
   {id:'sec-education',nav:'Education',title:'Education',intro:'Your highest completed credential and where you completed it.',fields:[
    {type:'select',key:'education',label:'Highest level of education completed',wide:true,options:indexed(aaip.educationLevels)},
    {type:'select',key:'educationLocation',label:'Where you completed it',wide:true,options:withPoints(aaip.educationLocations)}]},
   {id:'sec-language',nav:'Language',title:'Language test results',intro:'Alberta scores the lowest of your four abilities. English earns up to 10 and French up to 8; you get the higher, plus 3 if both are CLB/NCLC 4+. CLB/NCLC 4 in all four abilities is required to submit.',fields:LANGUAGES},
   {id:'sec-experience',nav:'Experience',title:'Work experience',intro:'Total experience includes work in Canada and abroad.',fields:[
    {type:'select',key:'totalExperience',label:'Total work experience',options:withPoints(aaip.totalExperience)},
    {type:'select',key:'canadaExperience',label:'Work experience in Canada',options:withPoints(aaip.canadaExperience)}]},
   {id:'sec-offer',nav:'Job offer',title:'Alberta job offer',intro:'Economic factors only apply with a permanent, full-time Alberta job offer.',fields:[
    {type:'check',key:'jobOffer',label:'Permanent, full-time job offer in Alberta (+10)'},
    {type:'check',key:'sectorOffer',show:p=>p.jobOffer,label:'Rural Renewal endorsement, tourism and hospitality offer, or law enforcement offer (+6)',hint:'Rural Renewal Stream community endorsement; a tourism and hospitality employer in a required sector association; or a law enforcement employer in the Alberta Association of Chiefs of Police.'},
    {type:'select',key:'offerLocation',show:p=>p.jobOffer,label:'Job offer location',wide:true,options:withPoints(aaip.offerLocations)},
    {type:'check',key:'regulated',show:p=>p.jobOffer,label:'Regulated occupation, and you hold the Alberta licence or certification (+10)',hint:'For trades: a valid Alberta Qualification Certificate or a trade certificate recognized by Alberta Apprenticeship and Industry Training.'}]},
   {id:'sec-eligibility',nav:'Eligibility',title:'Stream requirements',intro:'Each AAIP worker stream has its own requirements; the score only ranks eligible candidates.',fields:[
    {type:'tri',key:'streamEligible',label:'Do you meet the requirements of an AAIP worker stream (Alberta Opportunity, Alberta Express Entry, Rural Renewal, Dedicated Health Care, Tourism and Hospitality)?'},
    {type:'tri',key:'legalStatus',label:'If you are in Canada, do you hold valid status?',hint:'Choose Yes if you are outside Canada.'}]}],
  context:result=>drawCards(aaip.recentDraws,result.total,'AAIP also selects by occupation, sector and other factors, and doesn’t disclose all draw parameters.'),
  note:'Worker EOIs are valid for one year and cost $135 to submit (since April 7, 2026).'},
 sinp:{
  eyebrow:'Saskatchewan · SINP',title:'Estimate your SINP International Skilled Worker score.',
  intro:'Saskatchewan’s point assessment grid scores International Skilled Worker candidates out of 110. You need at least 60 to apply; expressions of interest are ranked by the same score.',
  reviewed:'Rules reviewed September 24, 2026 (official “Assess your eligibility” page).',
  sections:[
   {id:'sec-about',nav:'About you',title:'About you',intro:'Choose the sub-category you plan to apply under. It changes how Saskatchewan connections are scored.',fields:[
    {type:'select',key:'subcategory',label:'International Skilled Worker sub-category',wide:true,options:sinp.subcategories},AGE]},
   {id:'sec-education',nav:'Education',title:'Education and training',intro:'Use the Canadian equivalency of your highest credential.',fields:[
    {type:'select',key:'education',label:'Highest completed education or training',wide:true,options:indexed(sinp.educationLevels)}]},
   {id:'sec-experience',nav:'Experience',title:'Skilled work experience',intro:'Experience must relate to the occupation in your application. One year equals 12 full months.',fields:[
    {type:'select',key:'recentYears',label:'In the 5 years before you apply',options:withPoints(sinp.recentExperience)},
    {type:'select',key:'olderYears',label:'6 to 10 years before you apply',options:withPoints(sinp.olderExperience),hint:'The official grid gives no points row for 1 year in this period.'}]},
   {id:'sec-language',nav:'Language',title:'Language test results',intro:'Your stronger test counts as the first language (up to 20) and the other as the second (up to 10). Points use the lowest of the four abilities.',fields:LANGUAGES},
   {id:'sec-connections',nav:'Connections',title:'Connection to Saskatchewan',intro:p=>p.subcategory==='offer'?'The Employment Offer sub-category scores your Saskatchewan job offer.':'Occupations In-Demand and Saskatchewan Express Entry score family, work and study connections.',fields:[
    {type:'check',key:'jobOffer',show:p=>p.subcategory==='offer',label:'High-skilled employment offer from a Saskatchewan employer (+30)'},
    {type:'check',key:'relative',show:p=>p.subcategory!=='offer',label:'Close family relative in Saskatchewan (+20)',hint:'You or your spouse’s parent, sibling, grandparent, aunt, uncle, niece, nephew, first cousin, or step/in-law equivalents; a citizen or PR living in Saskatchewan and not supporting other relatives.'},
    {type:'check',key:'pastWork',show:p=>p.subcategory!=='offer',label:'At least 12 months of work in Saskatchewan in the past 5 years on a valid work permit (+5)'},
    {type:'check',key:'pastStudy',show:p=>p.subcategory!=='offer',label:'At least one full-time academic year at a Saskatchewan post-secondary institution on a study permit (+5)'}]},
   {id:'sec-eligibility',nav:'Eligibility',title:'Sub-category requirements',intro:'Beyond 60 points, International Skilled Worker candidates must meet these requirements.',fields:[
    {type:'tri',key:'relatedEducation',label:'Do you have post-secondary education, training or an apprenticeship related to your intended occupation?',hint:'Education completed outside Canada needs an ECA from an IRCC-designated organization.'},
    {type:'tri',key:'skilledWork',label:'Do you have 1+ year of full-time paid skilled (TEER 0–3) work in the last 10 years, in an in-demand occupation that isn’t excluded?'},
    {type:'tri',key:'legalStatus',label:'Do you live outside Canada or hold legal status in Canada, and are you not a refugee claimant?'},
    {type:'tri',key:'funds',label:'Can you show settlement funds and a settlement plan?'},
    {type:'tri',key:'expressEntry',show:p=>p.subcategory==='ee',label:'Do you have a valid Express Entry profile and job seeker validation code?'}]}],
  context(result){const s=sinp.lastSelection;return `<article class="draw-card muted"><h3>Expression of interest selections</h3><p>The SINP says no EOI draws are scheduled. Its selection results were last updated on ${s.date}, when the lowest invited score was ${s.score}. ${s.note}</p><a href="${sinp.sources['ISW EOI system']}" target="_blank" rel="noopener">SINP EOI system ↗</a></article><article class="draw-card ${result.total>=sinp.MINIMUM?'pass':'fail'}"><h3>Minimum to apply</h3><div class="draw-meta"><div><b>${sinp.MINIMUM}</b><span>Required points</span></div><div><b>${result.total}</b><span>Your score</span></div></div><p>${result.total>=sinp.MINIMUM?'You meet the 60-point minimum.':`${sinp.MINIMUM-result.total} points short of the 60-point minimum.`}</p></article>`;},
  note:'Occupations may be limited by in-demand lists and the excluded occupation list. EOI profiles are valid for one year.'},
 mpnp:{
  eyebrow:'Manitoba · MPNP',title:'Estimate your Manitoba EOI ranking score.',
  intro:'The Manitoba Provincial Nominee Program ranks Skilled Worker and International Education expressions of interest out of 1,000: up to 500 for human capital and 500 for your connection to Manitoba.',
  reviewed:'Rules reviewed September 24, 2026 (official EOI ranking page).',
  sections:[
   {id:'sec-about',nav:'About you',title:'About you',intro:'Age is scored on the day you submit your expression of interest.',fields:[AGE]},
   {id:'sec-language',nav:'Language',title:'Language test results',intro:'Your first official language earns up to 25 points for each of the four abilities. A second official language at CLB 5+ adds 25.',fields:LANGUAGES},
   {id:'sec-experience',nav:'Experience',title:'Work experience and education',intro:'Count full-time periods of 6+ months with one employer in the last 5 years, and don’t round up.',fields:[
    {type:'select',key:'experience',label:'Full years of work experience in the last 5 years',options:withPoints(mpnp.experienceOptions)},
    {type:'check',key:'licensed',label:'Fully recognized by a Manitoba licensing body for a regulated profession or trade (+100)'},
    {type:'select',key:'education',label:'Highest completed education',wide:true,options:indexed(mpnp.educationLevels)}]},
   {id:'sec-adaptability',nav:'Manitoba ties',title:'Adaptability and risk',intro:'You score your single highest connection. Manitoba Demand (500) replaces other connections.',fields:[
    {type:'select',key:'demand',label:'Manitoba demand',wide:true,options:withPoints(mpnp.demandOptions)},
    {type:'select',key:'connection',show:p=>p.demand==='none',label:'Your strongest connection to Manitoba',wide:true,options:withPoints(mpnp.connections),hint:'Close relative: parent, sibling, child, grandparent, aunt/uncle, niece/nephew or first cousin living in Manitoba.'},
    {type:'check',key:'regional',show:p=>p.demand==='none'&&p.connection!=='none',label:'Settling outside Winnipeg, with a connection to that region (+50)'},
    {type:'check',key:'workOther',label:'You or your spouse have work experience in another province (−100)'},
    {type:'check',key:'studyOther',label:'You or your spouse have studied in another province (−100)'}]},
   {id:'sec-eligibility',nav:'Eligibility',title:'Pathway requirements',intro:'Skilled Worker in Manitoba and Skilled Worker Overseas have their own requirements.',fields:[
    {type:'tri',key:'pathway',label:'Do you meet the requirements of your MPNP pathway?'},
    {type:'tri',key:'intention',label:'Do you intend to live and work in Manitoba?'}]}],
  context:result=>drawCards(mpnp.recentDraws,result.total,'Most MPNP selections (occupation-specific, francophone and strategic initiative) publish no score; these are recent rounds that did.'),
  note:'EOIs are valid for one year. Letters of Advice to Apply depend on processing targets and targeted selections.'},
 'pei-pnp':{
  eyebrow:'Prince Edward Island · PEI PNP',title:'Estimate your PEI expression of interest score.',
  intro:'Prince Edward Island scores every worker stream out of 100, with different weights for each stream. Pick your stream to see its grid.',
  reviewed:'Rules reviewed September 24, 2026 (PEI Workforce Application Guide, January 2026).',
  sections:[
   {id:'sec-about',nav:'About you',title:'Stream and age',intro:'Each stream weights age, language, education, experience, employment and adaptability differently.',fields:[
    {type:'select',key:'stream',label:'PEI stream',wide:true,options:pei.streams},AGE]},
   {id:'sec-language',nav:'Language',title:'Language',intro:p=>p.stream==='ig'?'Language isn’t scored for International Graduates.':pei.isExpressEntry(p.stream)?'Express Entry scores the lowest ability of your better test: CLB 7 earns 10, 8 earns 15, 9+ earns 20.':'Each language earns points for its lowest ability, up to 20 in total.',fields:[
    {type:'check',key:'employerForm',show:p=>p.stream==='sw-pei'||p.stream==='sw-out',label:'Employer signed the PEIW-02 Workforce Job Offer Form (20 in place of a test)',hint:'Confirms your English or French is sufficient for the job offered.'},
    {...LANGUAGES[0],show:p=>p.stream!=='ig'},{...LANGUAGES[1],show:p=>p.stream!=='ig'}]},
   {id:'sec-education',nav:'Education',title:'Education and experience',intro:'Points depend on your stream.',fields:[
    {type:'select',key:'education',label:'Highest completed education',wide:true,options:pei.educationLevels},
    {type:'select',key:'experience',show:p=>p.stream!=='ig',label:'Full-time work experience',options:pei.experienceOptions,hint:'Express Entry counts experience in the NOC in your federal profile.'}]},
   {id:'sec-employment',nav:'Employment',title:'Employment',intro:'Only the factors available in your stream are shown.',fields:pei.employmentFactors.map(([key,label,pts])=>({type:'check',key,show:p=>Boolean(pts[p.stream]),label:p=>`${label} (+${pts[p.stream]})`}))},
   {id:'sec-adaptability',nav:'Adaptability',title:'Adaptability',intro:'Each factor earns 5 points, up to the stream maximum.',fields:pei.adaptabilityFactors.map(f=>({type:'check',key:f[0],show:p=>pei.availableAdaptability(p.stream,f),label:`${f[1]} (+5)`}))},
   {id:'sec-eligibility',nav:'Eligibility',title:'Stream requirements',intro:'PEI doesn’t publish minimum scores. Invitations also depend on priority sectors.',fields:[
    {type:'tri',key:'expressEntry',show:p=>pei.isExpressEntry(p.stream),label:'Do you have a valid federal Express Entry profile?'},
    {type:'tri',key:'streamEligible',label:'Do you meet your stream’s requirements in the PEI Workforce Application Guide?'},
    {type:'tri',key:'intention',label:'Do you intend to live and work in Prince Edward Island?'}]}],
  context:()=>`<article class="draw-card muted"><h3>Invitation rounds</h3><p>PEI holds regular Labour and Express Entry draws but doesn’t publish minimum scores. In 2026 it has prioritized health care, trades, childcare and manufacturing; sales and service occupations may not be invited.</p><a href="${pei.sources['Expression of Interest draws']}" target="_blank" rel="noopener">PEI EOI draws ↗</a></article>`,
  note:'The Office of Immigration can change selection criteria and points at any time.'}};
