import {equivalents} from './express-entry.js';

// Score order: speaking, listening, reading, writing. Thresholds match IRCC.
export const tests = {
  ielts: {name:'IELTS General Training', language:'english', table:'IELTS General', min:[0,0,0,0], max:[9,9,9,9], step:0.5},
  celpip: {name:'CELPIP-General', language:'english', table:'CELPIP-General', min:[0,0,0,0], max:[12,12,12,12], step:1},
  pte: {name:'PTE Core', language:'english', table:'PTE Core', min:[10,10,10,10], max:[90,90,90,90], step:1},
  tef: {name:'TEF Canada · previous-score equivalency', language:'french', table:'TEF Canada¹', min:[0,0,0,0], max:[450,360,300,450], step:1},
  tcf: {name:'TCF Canada', language:'french', table:'TCF Canada', min:[0,0,0,0], max:[20,699,699,20], step:1}
};
export function convertScore(testId,ability,value) {
  const test=tests[testId];
  if(!test || !Number.isInteger(ability) || ability<0 || ability>3 || value===null || value===undefined || String(value).trim()==='') return null;
  const score=Number(value);
  if(!Number.isFinite(score) || score<test.min[ability] || score>test.max[ability] || !Number.isInteger((score-test.min[ability])/test.step)) return null;
  const rows=equivalents[test.table];
  for(let row=rows.length-1;row>=0;row--) if(score>=Number(rows[row][ability].split(/[–+]/)[0])) return row+4;
  return 0; // Below CLB/NCLC 4: no CRS language points.
}
export function applyScores(language) {
  const converted=(language.scores??['','','','']).map((value,i)=>convertScore(language.test,i,value));
  language.complete=converted.length===4 && converted.every(value=>value!==null);
  language.levels=converted.map(value=>value??0);
  language.tested=Boolean(language.test) && language.complete;
  return language;
}
