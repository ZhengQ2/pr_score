// Program finder view (/finder): one question per step, then a ranked shortlist of programs. Rules live in
// program-finder.js; this module only renders. Answers stay in memory, like the calculators' inputs.
import {questions,defaultAnswers,isAnswered,optionLabel,recommend,FIT} from './program-finder.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=$('finder-view');
let answers=defaultAnswers(),step=0,reviewing=false;

function questionHtml(){
 const q=questions[step],value=answers[q.id],last=step===questions.length-1,type=q.multi?'checkbox':'radio';
 const checked=v=>q.multi?value.includes(v):String(value)===String(v);
 return `<form id="finder-form" class="finder-step" novalidate>
  <div class="finder-progress"><span>Question ${step+1} of ${questions.length}</span><div class="finder-bar" aria-hidden="true"><span style="width:${step/questions.length*100}%"></span></div></div>
  <fieldset><legend id="finder-question" tabindex="-1">${q.title}</legend>${q.hint?`<p class="section-intro">${q.hint}</p>`:''}
  <div class="choices ${q.options.length>6?'choices-grid':''}">${q.options.map(([v,l])=>`<label class="choice"><input type="${type}" name="finder-${q.id}" value="${esc(v)}" ${checked(v)?'checked':''}><span>${l}</span></label>`).join('')}</div></fieldset>
  <div class="finder-actions">${step>0?'<button type="button" class="reset" id="finder-back">Back</button>':'<span></span>'}<button type="submit" class="finder-next" ${isAnswered(q,answers)?'':'disabled'}>${last||reviewing?'See my matches':'Next'}</button></div>
 </form>`;
}

function matchHtml(m){
 const mark=ok=>ok===null?'<span class="mark-q" aria-label="Needs confirmation">?</span>':ok?'<span class="mark-ok" aria-label="Met">✓</span>':'<span class="mark-no" aria-label="Not met">×</span>';
 const link=m.external?`<a href="${m.href}" target="_blank" rel="noopener">Official page ↗</a>`:`<a href="${m.href}" data-route>Open the ${esc(m.name)} calculator →</a>`;
 return `<article class="match match-${m.fit}"><div class="match-head"><div><span class="program-region">${esc(m.region)}${m.preferred?' · a province you’d consider':''}</span><h3>${esc(m.name)}</h3><span class="program-detail">Best path: ${esc(m.path)}</span></div><span class="status ${m.fit==='strong'?'pass':m.fit==='unlikely'?'fail':''}">${FIT[m.fit]}</span></div>
  ${m.estimate?`<p class="match-estimate"><b>${m.estimate.value.toLocaleString('en-CA')}</b> ${esc(m.estimate.label)} out of ${m.estimate.max.toLocaleString('en-CA')}</p>`:''}
  <ul class="match-checks">${m.checks.map(([label,ok])=>`<li>${mark(ok)}<span>${label}${ok===null?' — please confirm':''}</span></li>`).join('')}</ul>
  ${m.notes.map(n=>`<p class="match-note">${n}</p>`).join('')}${link}</article>`;
}

function resultsHtml(){
 const {results}=recommend(answers),groups=['strong','possible','unlikely'].map(fit=>[fit,results.filter(r=>r.fit===fit)]);
 const top=results.filter(r=>r.fit!=='unlikely').length;
 return `<section class="finder-results" aria-labelledby="finder-results-title"><div class="section-title"><span class="number">Your matches</span><h2 id="finder-results-title" tabindex="-1">${top?`${top} program${top>1?'s':''} worth a closer look`:'No program fits your answers yet'}</h2></div>
  <p class="section-intro">${top?'Programs are ranked by how many headline requirements your answers meet. Open a calculator to check every requirement and see your full score.':'Most programs need a job offer, a provincial connection or more skilled work experience. The requirements below show what would change the picture; improving your language results helps almost everywhere.'}</p>
  ${groups.filter(([,list])=>list.length).map(([fit,list])=>`<h3 class="finder-group">${FIT[fit]}</h3>${list.map(matchHtml).join('')}`).join('')}
  <details class="finder-answers"><summary>Review or change your answers</summary><dl>${questions.map((q,i)=>`<div><dt>${q.title}</dt><dd>${esc(optionLabel(q,answers[q.id]))} <button type="button" class="finder-edit" data-step="${i}">Change</button></dd></div>`).join('')}</dl></details>
  <button type="button" class="reset" id="finder-restart">Start over</button>
  <footer><p>PR Score is an independent planning tool, not a government decision. This shortlist screens a few headline requirements from your answers; it can’t account for every program rule, admissibility or current invitation priorities. Your answers stay on this page and are not saved.</p></footer></section>`;
}

function render(focus=true){
 const done=step>=questions.length;
 view.innerHTML=`<section class="intro finder-intro" aria-labelledby="finder-title"><div class="intro-copy"><div class="eyebrow">Program finder</div><h1 id="finder-title">Which PR programs fit your situation?</h1><p>Answer ${questions.length} quick questions. We’ll screen Express Entry and every provincial program with a published grid, and point you to the calculators worth your time.</p><a href="/" data-route class="back-link"><span aria-hidden="true">←</span> All programs</a></div><div class="intro-meta" aria-label="About this questionnaire"><div><strong>Private by design</strong><span>Your answers stay in this browser.</span></div><div><strong>Based on official criteria</strong><span>Uses the same rules as the calculators, reviewed September 2026.</span></div></div></section>
  ${done?resultsHtml():`<section>${questionHtml()}</section>`}`;
 if(focus)$(done?'finder-results-title':'finder-question')?.focus({preventScroll:true});
}

function readStep(){
 const q=questions[step],inputs=[...view.querySelectorAll(`input[name="finder-${q.id}"]`)];
 const value=v=>{const o=q.options.find(x=>String(x[0])===v);return o?o[0]:v;};
 answers[q.id]=q.multi?inputs.filter(i=>i.checked).map(i=>value(i.value)):(inputs.find(i=>i.checked)?value(inputs.find(i=>i.checked).value):null);
}
function go(next){step=next;render();view.scrollIntoView({block:'start'});}

view.addEventListener('change',e=>{if(!e.target.name?.startsWith('finder-'))return;
 const q=questions[step];if(q.exclusive!==undefined&&e.target.checked){const solo=e.target.value===String(q.exclusive);view.querySelectorAll(`input[name="finder-${q.id}"]`).forEach(i=>{if(i!==e.target&&(solo||i.value===String(q.exclusive)))i.checked=false;});}
 readStep();const btn=view.querySelector('.finder-next');if(btn)btn.disabled=!isAnswered(questions[step],answers);});
view.addEventListener('submit',e=>{e.preventDefault();readStep();if(!isAnswered(questions[step],answers))return;go(reviewing?questions.length:step+1);});
view.addEventListener('click',e=>{
 if(e.target.id==='finder-back'){readStep();go(step-1);return;}
 if(e.target.id==='finder-restart'){answers=defaultAnswers();reviewing=false;go(0);return;}
 const edit=e.target.closest('.finder-edit');if(edit){reviewing=true;go(Number(edit.dataset.step));}
});

// Called by the router whenever /finder is shown; keeps answers and the current step across navigation.
export function showFinder(){render(false);}
