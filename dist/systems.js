import {defaults,calculate,eligibility,sources} from './express-entry.js';
import * as oinp from './oinp.js';
import * as bcPnp from './bc-pnp.js';
import * as aaip from './aaip.js';
import * as sinp from './sinp.js';
import * as mpnp from './mpnp.js';
import * as peiPnp from './pei-pnp.js';
// Each adapter owns its profile schema; provincial adapters return {total,max,sections} and share the
// eligibility shape {programs:[{id,name,status,checks,url}]} so the UI can render them generically.
// rulesRevisedAt is IRCC's last substantive change to the CRS grid itself (arranged-employment
// bonus points were removed system-wide on this date) — not just when we last reviewed the rules.
// Draws before it used a different points formula, so historical "would you have been invited"
// comparisons must not reach further back than this date.
export const scoringSystems=new Map([['canada-express-entry',{id:'canada-express-entry',name:'Canada · Express Entry',version:'2026-09-16',rulesRevisedAt:'2025-03-25',maxScore:1200,defaults,calculate,eligibility,sources}],
 ['oinp',{id:'oinp',name:'Ontario · OINP Workforce Priority',shortName:'Ontario OINP',version:'2026-09-24',maxScore:oinp.MAX_SCORE,defaults:oinp.defaults,calculate:oinp.calculate,eligibility:oinp.eligibility,sources:oinp.sources}],
 ['bc-pnp',{id:'bc-pnp',name:'British Columbia · BC PNP Skills Immigration',shortName:'BC PNP',version:'2026-09-24',maxScore:bcPnp.MAX_SCORE,defaults:bcPnp.defaults,calculate:bcPnp.calculate,eligibility:bcPnp.eligibility,sources:bcPnp.sources}],
 ...[['aaip','Alberta · AAIP Worker EOI','Alberta AAIP',aaip],['sinp','Saskatchewan · SINP International Skilled Worker','SINP',sinp],['mpnp','Manitoba · MPNP Skilled Worker EOI','MPNP',mpnp],['pei-pnp','Prince Edward Island · PEI PNP','PEI PNP',peiPnp]].map(([id,name,shortName,m])=>[id,{id,name,shortName,version:'2026-09-24',maxScore:m.MAX_SCORE,defaults:m.defaults,calculate:m.calculate,eligibility:m.eligibility,sources:m.sources}])]);
export function registerSystem(system){if(!system.id||typeof system.calculate!=='function'||typeof system.defaults!=='function'||typeof system.eligibility!=='function')throw new TypeError('A scoring system requires id, defaults, calculate and eligibility');if(scoringSystems.has(system.id))throw new Error('System already registered');scoringSystems.set(system.id,system);}
