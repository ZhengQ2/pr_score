# PR Score

## Hosting

Published at https://pr.zhengqiu.net (private S3 bucket behind CloudFront, defined in `infra/site.yaml`). Deploy only when the owner asks: `scripts/deploy.sh` runs the tests, creates or updates the `pr-score-site` CloudFormation stack in us-east-1, syncs `dist/` and invalidates CloudFront. The `.openai/hosting.json` manifest records an older Sites private deployment and is not used.

Dependency-free, responsive calculators for Express Entry (CRS) and the provincial nominee programs of Ontario, British Columbia, Alberta, Saskatchewan, Manitoba and Prince Edward Island. `/` is a program picker and each calculator has a clean path: `/ee`, `/oinp`, `/bc-pnp`, `/aaip`, `/sinp`, `/mpnp`, `/pei-pnp`. `/finder` is a questionnaire that shortlists the programs that fit the user’s situation. Legacy `?system=<id>` links redirect. Extensionless paths are served `index.html`: by a CloudFront Function in production and by `scripts/serve.js` locally (`npm start`, http://127.0.0.1:4173). Asset URLs are absolute (`/app.js`) so they resolve from any route. Run `npm test` for rule tests and `npm run check` for JavaScript syntax checks.

## Structure

- `dist/express-entry.js`: pure CRS and CEC/FSW/FST screening functions, official source links, test-equivalence tables, and initial profile.
- `dist/systems.js`: scoring-system registry. Each adapter supplies `id`, `name`, `version`, `maxScore`, `defaults()`, `calculate(profile)`, `eligibility(profile)` and sources.
- `dist/oinp.js`, `dist/bc-pnp.js`, `dist/aaip.js`, `dist/sinp.js`, `dist/mpnp.js`, `dist/pei-pnp.js`: pure provincial rules (points grids, stream screening). `dist/provincial-common.js` holds shared helpers.
- `dist/programs.js`: catalogue of calculators (slug, system id, copy) plus provinces without a published grid; drives the landing page and router.
- `dist/province-forms.js`: declarative form definitions and results context for each provincial calculator.
- `dist/provincial.js`: router, landing page, and the schema-driven form and results renderer for provincial adapters.
- `dist/app.js`: accessible live form and result rendering. No backend or stored applicant data.
- `dist/program-finder.js`: pure questionnaire definition and `recommend(answers)` ranking for the program finder. `dist/finder.js` renders it one question at a time at `/finder`.
- `tests/scoring.test.js`, `tests/provincial.test.js`, `tests/provinces.test.js`: reference scenarios, caps, boundary and eligibility checks.

## Rule snapshot and interpretation

Official IRCC sources were reviewed September 16, 2026. Links are in the application and rule module. Maintain the rules and conversion tables as government criteria change. No CRS job-offer points are awarded. The engine compares both language orderings, including transferability, and chooses the higher total; ties use English. Spouse language uses the higher-scoring complete language, never a mixture of abilities. No-valid-test selections contribute zero regardless of retained benchmark levels. TEF mappings use previous-score equivalencies, not scores out of 699.

CRS and eligibility are separate. Eligibility uses explicit confirmations for qualifying work, funds and settlement intentions because CRS experience alone does not establish program-specific time windows or conditions. FSW uses a separate 100-point selection grid and adaptability cap. Positive results say “Likely eligible” and remain conditional on truthful confirmations, admissibility, documentary evidence and current IRCC rules. Exceptional public policies are not adjudicated by this tool. The CRS is an estimate even when program requirements are not met.

Tests are selected as already valid (under two years), rather than collecting test dates. ECA validity is self-confirmed (under five years). Users choose IELTS General Training, CELPIP-General, PTE Core, TEF Canada or TCF Canada and enter four independent raw scores. Numeric inputs and sliders stay synchronized. Complete, valid results convert automatically to CLB/NCLC; incomplete or invalid languages are excluded with an explanation. Switching tests clears scores to prevent reinterpreting them on a different scale. CLB/NCLC 10 and above share one scoring band.

The browser exposes an optional read-only WebMCP tool, `read_express_entry_estimate`, using the same visible profile and results.

## Program finder

The finder asks 15 questions: location, destination, age, spouse, education, English and French (lowest CLB/NCLC), TEER, skilled trade, Canadian and foreign skilled experience, job offer province, provincial relatives, provincial work or study, and settlement funds. Each program is screened on a few headline requirements (✓ met, × not met, ? needs confirmation). A program's fit is that of its best path: *Strong match* when every check is met, *Worth exploring* when some need confirmation, and *Not a fit right now* when any check fails. Results are ranked by fit, then whether the province was chosen as a destination, then the share of checks met.

Estimates reuse the real modules. CRS and the FSW 67-point grid come from `express-entry.js` and SINP points come from `sinp.js`. These estimates assume no Canadian education, sibling or nomination; a spouse earns no points; ECAs are valid; and experience is counted in whole years, with no SINP points for work 6–10 years ago. Provincial Express Entry paths (Alberta, PEI) inherit the federal result. Destination is multi-select: choosing none, or “Anywhere”, means flexible. Otherwise each unchosen province fails its intent-to-reside check, and Express Entry's outside-Quebec check fails only when Quebec is the sole choice. Chosen provinces rank first within each fit. New Brunswick, Nova Scotia, Newfoundland and Labrador, and Quebec appear only when the user has a job offer, a destination preference, a relative, or past work or study there, and they link to official pages. Answers stay in memory only.

## Occupation search

`dist/noc-2021.json` includes all 516 NOC 2021 Version 1.0 unit groups and 27,935 example titles, downloaded from Statistics Canada on September 16, 2026. Data sources: [classification structure](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv) and [elements](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv). Rebuild using `scripts/import-noc.py` with both downloaded CSV paths. Exclusion entries are not searchable aliases. Data attribution: Statistics Canada, National Occupational Classification 2021 Version 1.0; used under the [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence). This tool is not endorsed by Statistics Canada.

Search runs locally over official titles and codes. Choosing an occupation sets the CEC TEER category; title matches require confirmation against official duties. TEER 4/5 explicitly fails the CEC skilled-occupation check. Editing a search clears the old occupation and category until a new selection or manual category is chosen.

## Provincial rule snapshots (reviewed September 24, 2026)

**OINP · Ontario Workforce Priority stream** ([official page](https://www.ontario.ca/page/ontario-workforce-priority-stream), updated August 11, 2026). The June 26, 2026 redesign replaced the former employer job offer and graduate EOI streams, so earlier OINP draw cut-offs are not comparable and none are shown. The EOI grid totals 130: TEER (9), broad occupational category (10), hourly wage (15), Ontario work experience (18; time in the job offer position, otherwise other Ontario work up to 12), earnings history (8), legal status (10), education (10), Canadian credentials (10), language (15, lowest CLB of the better test), two official languages (10 with CLB 6+ in both, otherwise 5 with one tested language), and region (15). Self-employed physicians are scored as TEER 1, category 3, with no wage points. Screening covers TEER-based language (CLB 6, or 5 for listed skilled trades, 4 for TEER 4/5, with the recent Ontario graduate exemption), education, work experience, legal status and intent to reside.

**BC PNP · Skills Immigration** ([program guide](https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf), effective May 28 / June 10, 2026). The registration grid totals 200: directly related experience (40), education (40), language (40), hourly wage (55: $16 = 1 point, plus 1 per dollar up to $70+), and area (25). Annual salaries convert with 30–40 weekly hours. Screening covers the Skilled Worker and Health Authority streams and the Temporary Rural/Remote Health Support Initiative, the ineligible-NOC list, the CLB 4 requirement for TEER 2–5, and the LICO-based minimum family income. Recent invitation rounds come from `dist/provincial-draws.js` (see *Draw refresh* below).

**AAIP · Alberta Worker EOI** ([points grid](https://www.alberta.ca/system/files/im-worker-stream-expression-of-interest-points-grid.pdf), dated August 7, 2025). The grid totals 100: education (22), language (13: lowest ability; English up to 10, French up to 8, higher of the two, +3 bilingual at CLB 4+), work experience (21; "less than 6 months" still earns 3 as printed), age (5), family in Alberta (8), and job-offer factors (31).

**SINP · International Skilled Worker** ([assessment grid](https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/assess-your-eligibility)). The grid totals 110, and 60 are needed to apply. The stronger language test counts as the first language, using the lowest ability. The grid doesn't say this outright; it follows standard SINP practice. For experience 6–10 years ago, the official grid has no row for 1 year, so it scores 0. Saskatchewan connections depend on the sub-category (Employment Offer: job offer 30; others: relative 20, work 5, study 5). The last published selection (September 12, 2024, score 88) is shown because the SINP says no draws are scheduled.

**MPNP · Manitoba EOI** ([ranking system](https://immigratemanitoba.com/mpnp/apply/eoi/)). The grid totals 1,000. The first official language scores each of the four abilities (up to 25 each), and a second language at CLB 5+ adds 25. Adaptability uses the best single connection, adds regional points only alongside a connection, and Manitoba Demand (500) replaces the rest. Risk factors subtract up to 200; the total is not floored. Only draws that published a lowest-ranked score are listed.

**PEI PNP** ([Workforce Application Guide](https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf), January 2026, Appendices A–B). There are eight stream variants, each totalling 100, with per-area caps. Labour streams add English and French points up to 20; Express Entry uses the better test. Shaded (not applicable) cells were read from the rendered PDF. PEI publishes no draw cut-offs.

New Brunswick, Nova Scotia, Newfoundland and Labrador, and Quebec's PSTQ are listed on the landing page without calculators, because they publish no points grid for PNP selection.

## Draw refresh

`dist/provincial-draws.js` is generated by `npm run draws` (`scripts/fetch-draws.mjs`). The script scrapes the official BC PNP, AAIP, MPNP and OINP invitation pages. It keeps the latest scored round for each selection within 120 days of the newest round (at most 8), and writes the file only when the data changed. Parsers live in `scripts/draws/` and find tables by header text, not position. They handle BC's merged cells and Manitoba's mixed heading styles. They throw when a page no longer matches, and a failed source keeps its previous data with a warning, so a site redesign never publishes empty results. Tests use small HTML fixtures (`tests/draw-fetcher.test.js`). SINP (PDF; no draws scheduled) and PEI (no published scores) are not fetched.

`.github/workflows/refresh-draws.yml` runs this daily at 14:17 UTC and on demand. It runs the tests, then opens or updates a pull request from `automation/refresh-draws` when the data changed. The repository must allow GitHub Actions to create pull requests (Settings → Actions → General).

`.github/workflows/deploy.yml` publishes `dist/` when changes land on `main`. It stays skipped until the repository variable `AWS_DEPLOY_ROLE_ARN` is set. To enable it, deploy `infra/github-deploy-role.yaml`, which creates the GitHub OIDC provider and a role limited to uploading to the site bucket and invalidating the distribution, for `main` only. Then set the variable to the stack's `RoleArn` output. CI runs `SKIP_STACK=1 scripts/deploy.sh`, which uploads files only; infrastructure changes still go through a local `scripts/deploy.sh`.
