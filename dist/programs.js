// Catalogue of calculators and their clean URLs (pr.zhengqiu.net/<slug>). The landing page and router both read it.
export const programs=[
 {slug:'ee',system:'canada-express-entry',region:'Federal',name:'Express Entry',detail:'Comprehensive Ranking System',max:1200,blurb:'CRS score plus CEC, FSW and FST eligibility, compared with live IRCC draws.'},
 {slug:'oinp',system:'oinp',region:'Ontario',name:'OINP',detail:'Workforce Priority stream',max:130,blurb:'Expression of interest score for the stream that replaced Ontario’s employer and graduate streams in June 2026.'},
 {slug:'bc-pnp',system:'bc-pnp',region:'British Columbia',name:'BC PNP',detail:'Skills Immigration',max:200,blurb:'Registration score with wage and regional points, and recent targeted invitation rounds.'},
 {slug:'aaip',system:'aaip',region:'Alberta',name:'AAIP',detail:'Worker Expression of Interest',max:100,blurb:'Worker EOI score across human capital and Alberta job offer factors, with 2026 draw minimums.'},
 {slug:'sinp',system:'sinp',region:'Saskatchewan',name:'SINP',detail:'International Skilled Worker',max:110,blurb:'Point assessment grid for Occupations In-Demand, Saskatchewan Express Entry and Employment Offer.'},
 {slug:'mpnp',system:'mpnp',region:'Manitoba',name:'MPNP',detail:'Skilled Worker EOI ranking',max:1000,blurb:'EOI ranking score with Manitoba connections, demand and risk factors.'},
 {slug:'pei-pnp',system:'pei-pnp',region:'Prince Edward Island',name:'PEI PNP',detail:'Workforce and Express Entry',max:100,blurb:'Labour and Express Entry points grids for all eight PEI worker streams.'}];
// Provinces that select candidates without a published points grid: shown on the landing page, not scored.
export const unscored=[
 {region:'New Brunswick',name:'NBPNP',url:'https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/invitations-to-apply.html',note:'Invites from its EOI pool by labour market needs and priorities; no points grid is published.'},
 {region:'Nova Scotia',name:'NSNP',url:'https://novascotiaimmigration.com/move-here/',note:'Streams were redesigned in February 2026; selection is by labour market priorities, not published points.'},
 {region:'Newfoundland and Labrador',name:'NLPNP',url:'https://www.gov.nl.ca/immigration/expression-of-interest-model-overview/',note:'EOIs are prioritized with criteria rather than a public points score.'},
 {region:'Quebec',name:'PSTQ',url:'https://www.quebec.ca/en/immigration/permanent/skilled-workers',note:'Quebec runs its own selection system outside the Provincial Nominee Program.'}];
export const bySlug=slug=>programs.find(p=>p.slug===slug)??null;
export const bySystem=id=>programs.find(p=>p.system===id)??null;
