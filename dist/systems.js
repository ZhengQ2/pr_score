import {defaults,calculate,eligibility,sources} from './express-entry.js';
// Add independent adapters here for OINP or Australian 189/190; no CRS assumptions in the registry.
export const scoringSystems=new Map([['canada-express-entry',{id:'canada-express-entry',name:'Canada · Express Entry',version:'2026-09-16',maxScore:1200,defaults,calculate,eligibility,sources}]]);
export function registerSystem(system){if(!system.id||typeof system.calculate!=='function'||typeof system.defaults!=='function'||typeof system.eligibility!=='function')throw new TypeError('A scoring system requires id, defaults, calculate and eligibility');if(scoringSystems.has(system.id))throw new Error('System already registered');scoringSystems.set(system.id,system);}
