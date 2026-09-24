// Provincial nominee calculators (OINP, BC PNP) and the system switcher. Each system's form is a declarative
// list of sections so the rules modules stay UI-free and the renderer stays generic.
import {abilities} from './express-entry.js';
import {tests,convertScore,applyScores} from './language-tests.js';
import {searchOccupations} from './occupations.js';
import {scoringSystems} from './systems.js';
import * as oinp from './oinp.js';
import * as bc from './bc-pnp.js';
import {FORMS} from './province-forms.js';
import {programs,unscored,bySlug,bySystem} from './programs.js';
import {showFinder} from './finder.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TRI=[['unknown','Not sure / not answered'],['yes','Yes'],['no','No']];
const lowestTag=(l,fr)=>{const n=fr?'NCLC':'CLB';if(!l.tested)return `${n} auto-conversion`;const m=Math.min(...l.levels);return m===0?`Below ${n} 4`:`Lowest ${n} ${m===10?'10+':m}`;};
const TRACK_COLORS=['#a53d36','#d08b79','#6f917e','#d2b267','#6d8fa6'];

const states={},nocState={data:[],load:'idle',query:'',matches:[],active:-1};
let current=null;
const stateOf=id=>states[id]??=scoringSystems.get(id).defaults();
const resolve=(v,p)=>typeof v==='function'?v(p):v;

function fieldHtml(f,p,sys){
 if(f.show&&!f.show(p))return '';
 const label=resolve(f.label,p),hint=f.hint?`<span class="hint">${resolve(f.hint,p)}</span>`:'';
 if(f.type==='select'||f.type==='tri'){const items=f.type==='tri'?TRI:f.options;return `<div class="question ${f.wide||f.type==='tri'?'wide':''}"><label>${label}<select id="p-${f.key}" data-pkey="${f.key}">${items.map(([v,l])=>`<option value="${v}" ${String(v)===String(p[f.key])?'selected':''}>${l}</option>`).join('')}</select>${hint}</label></div>`;}
 if(f.type==='number')return `<div class="question ${f.wide?'wide':''}"><label>${label}<input type="number" id="p-${f.key}" data-pkey="${f.key}" inputmode="decimal" min="${f.min??''}" max="${f.max??''}" step="${resolve(f.step,p)??'any'}" placeholder="${resolve(f.placeholder,p)??''}" value="${esc(p[f.key])}">${hint}</label></div>`;
 if(f.type==='check')return `<div class="question wide"><label class="check"><input type="checkbox" id="p-${f.key}" data-pkey="${f.key}" ${p[f.key]?'checked':''}><span>${label}${f.hint?`<small>${resolve(f.hint,p)}</small>`:''}</span></label></div>`;
 if(f.type==='language')return `<div class="wide">${languageHtml(f.key,f.title,p)}</div>`;
 if(f.type==='noc')return nocHtml(p,sys);
 return '';
}
function benchmark(level,fr){return level===null?'Enter a valid score':level===0?`Below ${fr?'NCLC':'CLB'} 4`:`${fr?'NCLC':'CLB'} ${level===10?'10+':level}`;}
function languageHtml(key,title,p){
 const l=p[key],fr=key==='french',test=tests[l.test];
 const choices=[['','No valid test results'],...Object.entries(tests).filter(([,t])=>t.language===(fr?'french':'english')).map(([id,t])=>[id,t.name])];
 return `<div class="language" id="p-language-${key}"><div class="language-head"><h3>${title}</h3><span class="tag" id="p-${key}-lowest">${lowestTag(l,fr)}</span></div><label>Test taken<select data-plang="${key}" data-mode="test" id="p-${key}-test">${choices.map(([v,n])=>`<option value="${v}" ${v===l.test?'selected':''}>${n}</option>`).join('')}</select></label>${test?`${l.test==='tef'?'<p class="test-notice">Use the <strong>Équivalence ancien score</strong> column on your TEF report, not “Score / 699”.</p>':''}<div class="abilities score-inputs">${abilities.map((ability,i)=>{const v=l.scores[i]??'',level=convertScore(l.test,i,v);return `<div class="score-input"><label for="p-${key}-score-${i}">${ability}</label><input id="p-${key}-score-${i}" type="number" inputmode="${test.step===0.5?'decimal':'numeric'}" data-plang="${key}" data-score="${i}" min="${test.min[i]}" max="${test.max[i]}" step="${test.step}" value="${esc(v)}" placeholder="Score" aria-describedby="p-${key}-benchmark-${i}"><span class="hint">${test.min[i]}–${test.max[i]}</span><output class="benchmark" id="p-${key}-benchmark-${i}">${benchmark(level,fr)}</output></div>`;}).join('')}</div><p class="hint" id="p-${key}-completion">${l.complete?'All four scores converted. Points use your lowest ability.':'Complete all four scores to include this language.'}</p>`:'<div class="empty">No language points claimed. Choose a test taken in the last 2 years to enter scores.</div>'}</div>`;
}
function nocHtml(p,sys){
 const flags=[];
 if(p.noc&&sys==='bc-pnp'&&bc.ineligibleNocs[p.noc])flags.push('This occupation is not eligible for any BC PNP Skills Immigration stream.');
 if(p.noc&&sys==='bc-pnp'&&Number(p.noc[1])>=4&&!bc.ruralHealthNocs.includes(p.noc))flags.push('TEER 4/5 offers are only eligible through the Rural/Remote Health initiative (NOC 64410, 65310, 65312).');
 if(p.noc&&sys==='oinp'&&p.skilledTrade)flags.push('Listed skilled trade: CLB 5 and a high school diploma meet the stream minimums.');
 const selected=p.noc?`<div class="occupation-selection"><strong>${esc(p.nocTitle)}</strong><span>NOC ${p.noc} · TEER ${p.noc[1]} · Category ${p.noc[0]}</span>${flags.map(f=>`<span>${f}</span>`).join('')}</div>`:'';
 return `<div class="wide occupation-picker"><label for="p-occupation-search">Find the job offer occupation</label><input type="search" id="p-occupation-search" role="combobox" aria-autocomplete="list" aria-controls="p-occupation-options" aria-expanded="false" autocomplete="off" placeholder="Type a job title or NOC code, e.g. electrician" value="${esc(nocState.query)}"><div id="p-occupation-options" class="occupation-options" role="listbox" aria-label="Matching occupations" hidden></div><p id="p-occupation-feedback" class="hint" aria-live="polite"></p><div id="p-occupation-selected">${selected}</div><p class="hint">Search official NOC 2021 titles and choose the one matching your job offer duties. You can also set the TEER below.</p></div>`;
}

function renderForm(){
 const def=FORMS[current],p=stateOf(current),focusId=document.activeElement?.id;
 $('p-form').innerHTML=def.sections.map((s,i)=>`<section id="${s.id}"><div class="section-title"><span class="number">${i===def.sections.length-1?'Eligibility':`Step ${i+1}`}</span><h2>${s.title}</h2></div><p class="section-intro">${resolve(s.intro,p)}</p><div class="fields">${s.fields.map(f=>fieldHtml(f,p,current)).join('')}</div></section>`).join('')+'<button type="button" class="reset" id="p-reset">Reset this calculator</button>';
 if(focusId&&$(focusId)&&focusId.startsWith('p-'))$(focusId).focus({preventScroll:true});
}
function renderResults(){
 const sys=scoringSystems.get(current),def=FORMS[current],p=stateOf(current),r=sys.calculate(p),e=sys.eligibility(p);
 $('p-total').textContent=r.total;$('p-total').setAttribute('aria-label',`${r.total} of ${r.max} points`);$('p-mobile-total').textContent=r.total;
 $('p-language-choice').textContent=r.firstLanguage?`${r.firstLanguage} results give you the most language points.`:'Add valid language test results for language points.';
 $('p-score-track').innerHTML=r.sections.map((s,i)=>`<span style="width:${s.points/r.max*100}%;background:${TRACK_COLORS[i]}"></span>`).join('');
 $('p-breakdown').innerHTML=r.sections.map(s=>`<div class="break-row"><span>${s.name}</span><b>${s.points}<small> / ${s.max}</small></b></div>`).join('')+`<details><summary>See point-by-point breakdown</summary>${r.sections.map(s=>`<p>${s.name}</p>${Object.entries(s.detail).map(([k,v])=>`<div class="detail"><span>${k}</span><b>${v}</b></div>`).join('')}`).join('')}${r.hourly!=null?`<p>Hourly wage used for scoring: $${r.hourly.toFixed(2)}</p>`:''}</details>`;
 $('p-context').innerHTML=def.context(r);
 $('p-pathways').innerHTML=e.programs.map(pr=>`<article class="pathway"><div class="pathway-head"><h3>${esc(pr.name)}</h3><span class="status ${pr.status==='Likely eligible'?'pass':''}">${pr.status}</span></div><ul>${pr.checks.map(([name,ok])=>`<li>${ok===null?'?':ok?'✓':'×'} ${name}${ok===null?' — please confirm':''}</li>`).join('')}</ul><a href="${pr.url}" target="_blank" rel="noopener">Official requirements ↗</a></article>`).join('');
}
function renderView(){
 const def=FORMS[current],sys=scoringSystems.get(current);
 $('province-view').innerHTML=`<section class="intro" aria-labelledby="p-title"><div class="intro-copy"><div class="eyebrow">${def.eyebrow}</div><h1 id="p-title">${def.title}</h1><p>${def.intro}</p><a class="start-link" href="#${def.sections[0].id}">Start the calculator <span aria-hidden="true">↓</span></a></div><div class="intro-meta" aria-label="About this calculator"><div><strong>Private by design</strong><span>Your answers stay in this browser.</span></div><div><strong>Based on official criteria</strong><span>${def.reviewed}</span></div></div></section>
 <div class="layout"><div class="workspace"><nav aria-label="Calculator sections">${def.sections.map(s=>`<a href="#${s.id}">${s.nav}</a>`).join('')}<a href="#p-results">Results</a></nav><form id="p-form" novalidate></form>
 <section id="p-results"><div class="section-title"><span class="number">Results</span><h2>Eligibility and recent rounds</h2></div><p class="section-intro">Your score and stream eligibility are separate. Meeting the requirements doesn’t guarantee an invitation.</p><div id="p-context" class="draw-info" aria-live="polite"></div><div id="p-pathways"></div></section>
 <footer id="p-sources"><h3>Sources and important notes</h3><div class="source-links">${Object.entries(sys.sources).map(([k,v])=>`<a href="${v}" target="_blank" rel="noopener">${k} ↗</a>`).join('')}<span>Reviewed September 24, 2026</span></div><p>PR Score is an independent planning tool, not a provincial decision. ${def.note} Your inputs stay on this page and are not saved. Occupation data: Statistics Canada, NOC 2021 Version 1.0, used under the Statistics Canada Open Licence.</p></footer></div>
 <aside aria-label="Score summary"><div class="score-card" id="p-score-card"><div class="score-top"><span>Your estimated ${esc(sys.shortName)} score</span><span class="live-dot">Updates live</span></div><div class="score-value"><output id="p-total">0</output><span>out of ${sys.maxScore.toLocaleString('en-CA')}</span></div><p id="p-language-choice"></p><div class="score-track" id="p-score-track" aria-hidden="true"></div><div id="p-breakdown" class="breakdown"></div><div class="score-foot">This is an estimate for planning, not a nomination decision.</div></div></aside></div>
 <a class="mobile-score-bar" href="#p-score-card"><span>Estimated score<b id="p-mobile-total">0</b></span><em>View breakdown</em></a>`;
 renderForm();renderResults();observeScoreBar();
}
let barSpy=null;
function observeScoreBar(){barSpy?.disconnect();const bar=document.querySelector('#province-view .mobile-score-bar'),card=$('p-score-card');if(!bar||!card)return;barSpy=new IntersectionObserver(([en])=>bar.classList.toggle('is-hidden',en.isIntersecting),{threshold:0});barSpy.observe(card);}

// Field lookup for type coercion: numeric options stay numbers.
function fieldFor(key){for(const s of FORMS[current].sections)for(const f of s.fields)if(f.key===key)return f;return null;}
function setValue(t){
 const p=stateOf(current),key=t.dataset.pkey,f=fieldFor(key);
 if(f.type==='check')p[key]=t.checked;
 else if(f.type==='number')p[key]=t.value===''?'':Number(t.value);
 else p[key]=typeof f.options?.[0]?.[0]==='number'?Number(t.value):t.value;
 if(key==='teer'||key==='category'){p.noc=null;p.nocTitle='';nocState.query='';}
}
function onInput(e){
 const t=e.target,p=stateOf(current);
 if(t.id==='p-occupation-search'){nocState.query=t.value;if(p.noc){p.noc=null;p.nocTitle='';$('p-occupation-selected').innerHTML='';}showMatches();renderResults();return;}
 if(t.dataset.score!==undefined){const key=t.dataset.plang,i=Number(t.dataset.score),l=p[key];l.scores[i]=t.value;applyScores(l);const level=convertScore(l.test,i,t.value),fr=key==='french';t.setAttribute('aria-invalid',String(t.value!==''&&level===null));$(`p-${key}-benchmark-${i}`).textContent=benchmark(level,fr);$(`p-${key}-completion`).textContent=l.complete?'All four scores converted. Points use your lowest ability.':'Complete all four scores to include this language.';$(`p-${key}-lowest`).textContent=lowestTag(l,fr);renderResults();return;}
 if(t.dataset.pkey&&t.type==='number'){setValue(t);renderResults();}
}
function onChange(e){
 const t=e.target,p=stateOf(current);
 if(t.dataset.plang&&t.dataset.mode==='test'){p[t.dataset.plang]={test:t.value,scores:['','','',''],levels:[0,0,0,0],tested:false,complete:false};renderForm();renderResults();return;}
 if(!t.dataset.pkey||t.type==='number')return;
 setValue(t);renderForm();renderResults();
}

async function loadNoc(){
 if(nocState.load!=='idle')return;nocState.load='loading';
 try{const r=await fetch('/noc-2021.json');if(!r.ok)throw new Error('NOC unavailable');nocState.data=await r.json();nocState.load='ready';}catch{nocState.load='error';}
 if(document.activeElement?.id==='p-occupation-search')showMatches();
}
function closeMatches(){const list=$('p-occupation-options');if(list)list.hidden=true;const input=$('p-occupation-search');if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}nocState.active=-1;}
function showMatches(){
 const input=$('p-occupation-search'),list=$('p-occupation-options');if(!input||!list)return;
 nocState.matches=searchOccupations(nocState.data,nocState.query);nocState.active=-1;
 list.innerHTML=nocState.matches.map((g,i)=>`<div role="option" id="p-occupation-option-${i}" aria-selected="false" data-pnoc="${i}"><strong>${esc(g.matchedTitle)}</strong><span>NOC ${g.code} · TEER ${g.teer} · ${esc(g.title)}</span></div>`).join('');
 list.hidden=!nocState.matches.length;input.setAttribute('aria-expanded',String(nocState.matches.length>0));
 $('p-occupation-feedback').textContent=nocState.load==='loading'?'Loading official occupation titles…':nocState.load==='error'?'Occupation data could not load. Use the TEER selector below.':nocState.query.trim().length<2?'Enter at least two characters.':nocState.matches.length?`${nocState.matches.length} matching occupation groups. Use arrow keys and Enter to select.`:'No match found. Try fewer words or a five-digit NOC code.';
}
function chooseMatch(i){
 const g=nocState.matches[i];if(!g)return;const p=stateOf(current);
 p.noc=g.code;p.nocTitle=g.matchedTitle;p.teer=String(g.teer);
 if(current==='oinp'){p.category=g.code[0];p.skilledTrade=oinp.isOinpSkilledTrade(g.code);}
 nocState.query=g.matchedTitle;renderForm();closeMatches();renderResults();
 $('p-occupation-feedback').textContent=`Selected NOC ${g.code}, TEER ${g.teer}.`;
}
function onKeydown(e){
 if(e.target.id!=='p-occupation-search')return;
 if(e.key==='Escape'){closeMatches();return;}
 if(e.key==='Enter'){e.preventDefault();if(nocState.active>=0)chooseMatch(nocState.active);return;}
 if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();
 if($('p-occupation-options').hidden)showMatches();const n=nocState.matches.length;if(!n)return;
 nocState.active=(nocState.active+(e.key==='ArrowDown'?1:-1)+n)%n;
 e.target.setAttribute('aria-activedescendant',`p-occupation-option-${nocState.active}`);
 document.querySelectorAll('[data-pnoc]').forEach((o,i)=>o.setAttribute('aria-selected',String(i===nocState.active)));
 $(`p-occupation-option-${nocState.active}`).scrollIntoView({block:'nearest'});
}

const view=$('province-view');
view.addEventListener('input',onInput);
view.addEventListener('change',onChange);
view.addEventListener('keydown',onKeydown);
view.addEventListener('submit',e=>e.preventDefault());
view.addEventListener('focusin',e=>{if(e.target.id==='p-occupation-search'){loadNoc();showMatches();}});
view.addEventListener('pointerdown',e=>{if(e.target.closest('[data-pnoc]'))e.preventDefault();});
view.addEventListener('click',e=>{
 const opt=e.target.closest('[data-pnoc]');if(opt){chooseMatch(Number(opt.dataset.pnoc));return;}
 if(e.target.id==='p-reset'){states[current]=scoringSystems.get(current).defaults();nocState.query='';renderView();$(FORMS[current].sections[0].id).scrollIntoView({behavior:'smooth'});}
 if(!e.target.closest('.occupation-picker'))closeMatches();
});

// Router: each calculator has a clean path (/ee, /oinp, …) and "/" is the program picker. CloudFront and the
// local dev server both serve index.html for extensionless paths; legacy ?system=<id> links are redirected.
const TITLE='PR Score';
const landing=$('landing-view'),eeView=$('ee-view'),bar=$('program-bar'),finderView=$('finder-view');
function renderLanding(){
 const card=pr=>`<a class="program-card" href="/${pr.slug}" data-route><span class="program-region">${pr.region}</span><strong>${pr.name}</strong><span class="program-detail">${pr.detail}</span><p>${pr.blurb}</p><span class="program-max">Scored out of ${pr.max.toLocaleString('en-CA')}</span></a>`;
 landing.innerHTML=`<section class="intro landing-intro" aria-labelledby="landing-title"><div class="intro-copy"><div class="eyebrow">Canadian permanent residence</div><h1 id="landing-title">Which program are you scoring?</h1><p>Pick a federal or provincial program to estimate your score and screen its requirements. Each calculator follows that program’s official points grid.</p></div><div class="intro-meta" aria-label="About these calculators"><div><strong>Private by design</strong><span>Your answers stay in this browser.</span></div><div><strong>Based on official criteria</strong><span>Rules reviewed September 2026.</span></div></div></section>
 <a class="finder-cta" href="/finder" data-route><span><strong>Not sure which program fits?</strong> Answer a short questionnaire and get a ranked shortlist of the programs worth scoring.</span><em>Find my programs →</em></a>
 <h2 class="landing-heading">Federal</h2><div class="program-grid">${programs.filter(pr=>pr.region==='Federal').map(card).join('')}</div>
 <h2 class="landing-heading">Provincial nominee programs</h2><div class="program-grid">${programs.filter(pr=>pr.region!=='Federal').map(card).join('')}</div>
 <h2 class="landing-heading">No published points grid</h2><p class="landing-note">These programs select candidates by labour market priorities rather than a public score, so there’s nothing to calculate. Check their official pages for current criteria.</p><ul class="unscored-list">${unscored.map(u=>`<li><a href="${u.url}" target="_blank" rel="noopener"><strong>${u.region} · ${u.name} ↗</strong></a><span>${u.note}</span></li>`).join('')}</ul>
 <footer><p>PR Score is an independent planning tool, not a government decision. Scores and eligibility screening are estimates based on your answers.</p></footer>`;
}
function routeFromLocation(){
 const legacy=new URLSearchParams(location.search).get('system');
 if(legacy){const pr=bySystem(legacy)??bySlug('ee');history.replaceState(null,'',`/${pr.slug}${location.hash}`);}
 return location.pathname.replace(/^\/+|\/+$/g,'').toLowerCase();
}
function show(slug){
 const pr=bySlug(slug),ee=pr?.system==='canada-express-entry',finder=slug==='finder';
 finderView.hidden=!finder;
 if(finder){landing.hidden=eeView.hidden=view.hidden=bar.hidden=true;$('source-shortcut').hidden=true;document.querySelector('.skip-link').setAttribute('href','#finder-view');document.title=`${TITLE} · Program finder`;current=null;showFinder();return;}
 landing.hidden=Boolean(pr);eeView.hidden=!ee;view.hidden=!pr||ee;bar.hidden=!pr;
 if(!pr){if(!landing.innerHTML)renderLanding();document.querySelector('.skip-link').setAttribute('href','#landing-view');document.title=`${TITLE} · Canadian PR score calculators`;$('source-shortcut').hidden=true;current=null;return;}
 $('source-shortcut').hidden=false;
 $('program-select').value=pr.slug;
 $('source-shortcut').setAttribute('href',ee?'#sources':'#p-sources');
 document.querySelector('.skip-link').setAttribute('href',ee?'#profile':`#${FORMS[pr.system].sections[0].id}`);
 document.title=`${TITLE} · ${pr.region==='Federal'?'':pr.region+' '}${pr.name} calculator`;
 if(!ee&&current!==pr.system){current=pr.system;nocState.query=stateOf(current).nocTitle??'';renderView();}
}
function navigate(href){history.pushState(null,'',href);show(routeFromLocation());window.scrollTo({top:0});}
$('program-select').innerHTML=programs.map(pr=>`<option value="${pr.slug}">${pr.region==='Federal'?'':pr.region+' · '}${pr.name}</option>`).join('');
$('program-select').addEventListener('change',e=>navigate(`/${e.target.value}`));
document.addEventListener('click',e=>{const a=e.target.closest('a[data-route]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(a.getAttribute('href'));});
window.addEventListener('popstate',()=>show(routeFromLocation()));
show(routeFromLocation());

if(document.modelContext?.registerTool){Promise.resolve(document.modelContext.registerTool({name:'read_provincial_estimate',description:'Read the current visible provincial nominee program score and stream screening without changing the profile.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){if(!current||view.hidden)return {active:false};const sys=scoringSystems.get(current),p=stateOf(current);return {system:current,score:sys.calculate(p),eligibility:sys.eligibility(p)};}})).catch(()=>{});}
