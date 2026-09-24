import {test} from 'node:test';import assert from 'node:assert/strict';
import {tables,text,isoDate} from '../scripts/draws/html.mjs';
import {SOURCES,selectRecent} from '../scripts/draws/sources.mjs';
import {provincialDraws} from '../dist/provincial-draws.js';

test('text() drops inline tags without splitting numbers and decodes entities',()=>{
 assert.equal(text('<li>Issued: <strong>60</strong><strong>5</strong></li>'),'Issued: 605');
 assert.equal(text('<p>A&nbsp;&amp;&#8211;B</p><p>C</p>'),'A &–B C');
});

test('isoDate tolerates tags and spaces around the comma',()=>{
 assert.equal(isoDate(text('<strong>September 22</strong><strong>, 2026</strong>')),'2026-09-22');
 assert.equal(isoDate('Last updated: Sept. 9, 2026'),'2026-09-09');
 assert.equal(isoDate('no date'),null);
});

test('tables() expands rowspans into full rows',()=>{
 const [g]=tables('<table><tr><th>Date</th><th>Type</th><th>Score</th></tr><tr><td rowspan="2">May 6, 2026</td><td>A</td><td rowspan="2">90</td></tr><tr><td>B</td></tr></table>');
 assert.deepEqual(g,[['Date','Type','Score'],['May 6, 2026','A','90'],['May 6, 2026','B','90']]);
});

const BC=`<p>Last updated: <strong>September 22</strong><strong>, 2026</strong></p><table><tr><td>Date</td><td>ITA type</td><td>Selection factors</td><td>Minimum score</td><td>Number of invitations</td></tr>
<tr><td>September 17, 2026</td><td>Rural Health</td><td>Points</td><td>60</td><td>33</td></tr>
<tr><td rowspan="2">August 20, 2026</td><td>Innovate: High Economic Impact</td><td>Wage of $55/hour</td><td>N/A</td><td>337</td></tr>
<tr><td>Innovate: High Economic Impact</td><td>Points</td><td>132</td><td>265</td></tr></table>
<table><tr><td>Date</td><td>Stream</td><td>Minimum Score</td><td>Number of Invitations</td></tr><tr><td>September 22, 2026</td><td>Base</td><td>119</td><td>10</td></tr></table>`;
test('BC parser reads the Skills Immigration table, skips wage-based rounds and ignores Entrepreneur tables',()=>{
 const r=SOURCES['bc-pnp'].parse(BC);
 assert.equal(r.updated,'2026-09-22');
 assert.deepEqual(r.rounds,[{date:'2026-09-17',label:'Rural Health',detail:'',score:60,size:'33'},{date:'2026-08-20',label:'Innovate: High Economic Impact',detail:'',score:132,size:'265'}]);
});

test('AAIP parser finds the draw table by its headers',()=>{
 const r=SOURCES.aaip.parse('<p>Last updated: September 9, 2026</p><table><tr><td>2026 nomination allocation</td></tr><tr><td>6,403</td></tr></table><table><tr><th>Draw date</th><th>Worker stream, pathway, initiative</th><th>Minimum score of invited candidates</th><th>Number of invitations</th></tr><tr><td>September 1, 2026</td><td>Alberta Opportunity Stream</td><td>56</td><td>575</td></tr><tr><td>July 10, 2026</td><td>Law Enforcement Pathway</td><td>52</td><td>Less than 10</td></tr></table>');
 assert.equal(r.updated,'2026-09-09');
 assert.deepEqual(r.rounds.map(x=>[x.date,x.label,x.score,x.size]),[['2026-09-01','Alberta Opportunity Stream',56,'575'],['2026-07-10','Law Enforcement Pathway',52,'Less than 10']]);
});

const MB=`<article><h2><a>Expression of Interest Draw #276</a></h2><span class="published"> July 30, 2026 </span>
<h4><strong>Occupation-specific selections</strong></h4><p>Profiles declaring employment in the unit groups listed below were considered.</p><ul><li>Number of Letters of Advice to Apply issued: <strong>74</strong></li></ul>
<p>Top scoring profiles in category 9, were considered.</p><ul><li>Number of Letters of Advice to Apply issued: <strong>60</strong><strong>5</strong></li><li>Ranking score of lowest-ranked candidate invited: <strong>632</strong></li></ul>
<p><strong>Francophone selection</strong></p><p>French profiles were considered.</p><ul><li>Number of Letters of Advice to Apply issued: <strong>17</strong></li></ul></article>
<article><h2><a>Expression of Interest Draw #275</a></h2><span class="published"> July 16, 2026 </span><p><strong>Completed post-secondary study in Manitoba</strong></p><p>Top Scoring profiles were considered. Please see note #5 for more details.</p><ul><li>Number of Letters of Advice to Apply issued: <strong>1,874</strong></li><li>Ranking score of lowest-ranked candidate invited: <strong>825</strong></li></ul></article>`;
test('MPNP parser pairs each published score with its selection, heading style and split numbers included',()=>{
 const r=SOURCES.mpnp.parse(MB);
 assert.deepEqual(r.rounds.map(({group,...x})=>x),[
  {date:'2026-07-30',label:'Occupation-specific selections',detail:'Draw #276: Top scoring profiles in category 9, were considered.',score:632,size:'605'},
  {date:'2026-07-16',label:'Completed post-secondary study in Manitoba',detail:'Draw #275: Top Scoring profiles were considered.',score:825,size:'1,874'}]);
});

test('OINP parser returns Workforce Priority rounds only, and none is a valid result',()=>{
 const page=body=>`<h2>Invitations to apply issued in 2026 to date</h2>${body}<div>Updated: August 11, 2026</div>`;
 const old='<h3>Employer Job Offer: Foreign Worker stream</h3><table><tr><th>Date issued</th><th>Number of invitations issued</th><th>Score range</th><th>Notes</th></tr><tr><td>April 30, 2026</td><td>786</td><td>57 and above</td><td>GTA</td></tr></table>';
 assert.deepEqual(SOURCES.oinp.parse(page(old)).rounds,[]);
 const wp='<h3>Ontario Workforce Priority stream</h3><table><tr><th>Date issued</th><th>Number of invitations issued</th><th>Score range</th><th>Notes</th></tr><tr><td>October 1, 2026</td><td>500</td><td>71 and above</td><td>Health occupations. Please refer to the updates page.</td></tr></table>';
 assert.deepEqual(SOURCES.oinp.parse(page(old+wp)).rounds,[{date:'2026-10-01',label:'Ontario Workforce Priority stream',detail:'Health occupations.',score:71,size:'500'}]);
});

test('Parsers throw on unrecognized pages instead of returning empty data',()=>{
 for(const id of ['bc-pnp','aaip','mpnp','oinp'])assert.throws(()=>SOURCES[id].parse('<html><body>Maintenance</body></html>'),Error,id);
});

test('selectRecent keeps the latest round per selection within the window',()=>{
 const rounds=[{date:'2026-09-10',label:'A',detail:'',score:1},{date:'2026-08-01',label:'A',detail:'',score:2},{date:'2026-08-01',label:'B',detail:'',score:3},{date:'2026-03-01',label:'C',detail:'',score:4}];
 assert.deepEqual(selectRecent(rounds).map(r=>r.score),[1,3]);
});

test('Generated draw data has the expected shape',()=>{
 for(const id of ['bc-pnp','aaip','mpnp','oinp']){
  const d=provincialDraws[id];assert.ok(d,id);assert.match(d.url,/^https:\/\//);
  for(const r of d.rounds){assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);assert.equal(typeof r.score,'number');assert.equal(typeof r.label,'string');assert.ok(!('group' in r));}
 }
});
