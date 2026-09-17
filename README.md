# PR Score

## Hosting preference

Keep this project local. Do not deploy or publish further changes unless the user explicitly requests it. The user plans to use their own domain later. A Sites private deployment was submitted before this preference was received; the hosting manifest records that existing project and is not permission to publish.

Dependency-free, responsive Express Entry calculator. Serve `dist/` with any static HTTP server; `npm start` serves it on http://127.0.0.1:4173. Run `npm test` for rule tests and `npm run check` for JavaScript syntax checks.

## Structure

- `dist/express-entry.js`: pure CRS and CEC/FSW/FST screening functions, official source links, test-equivalence tables, and initial profile.
- `dist/systems.js`: scoring-system registry. Each adapter supplies `id`, `name`, `version`, `maxScore`, `defaults()`, `calculate(profile)`, `eligibility(profile)` and sources. Add OINP or Australia 189/190 as independent adapters with their own profile schema and UI; these systems are not implemented yet.
- `dist/app.js`: accessible live form and result rendering. No backend or stored applicant data.
- `tests/scoring.test.js`: reference scenarios, caps, boundary and eligibility checks.

## Rule snapshot and interpretation

Official IRCC sources were reviewed September 16, 2026. Links are in the application and rule module. Maintain the rules and conversion tables as government criteria change. No CRS job-offer points are awarded. The engine compares both language orderings, including transferability, and chooses the higher total; ties use English. Spouse language uses the higher-scoring complete language, never a mixture of abilities. No-valid-test selections contribute zero regardless of retained benchmark levels. TEF mappings use previous-score equivalencies, not scores out of 699.

CRS and eligibility are separate. Eligibility uses explicit confirmations for qualifying work, funds and settlement intentions because CRS experience alone does not establish program-specific time windows or conditions. FSW uses a separate 100-point selection grid and adaptability cap. Positive results say “Likely eligible” and remain conditional on truthful confirmations, admissibility, documentary evidence and current IRCC rules. Exceptional public policies are not adjudicated by this tool. The CRS is an estimate even when program requirements are not met.

Tests are selected as already valid (under two years), rather than collecting test dates. ECA validity is self-confirmed (under five years). Users choose IELTS General Training, CELPIP-General, PTE Core, TEF Canada or TCF Canada and enter four independent raw scores. Numeric inputs and sliders stay synchronized. Complete, valid results convert automatically to CLB/NCLC; incomplete or invalid languages are excluded with an explanation. Switching tests clears scores to prevent reinterpreting them on a different scale. CLB/NCLC 10 and above share one scoring band.

The browser exposes an optional read-only WebMCP tool, `read_express_entry_estimate`, using the same visible profile and results.

## Occupation search

`dist/noc-2021.json` includes all 516 NOC 2021 Version 1.0 unit groups and 27,935 example titles, downloaded from Statistics Canada on September 16, 2026. Data sources: [classification structure](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv) and [elements](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv). Rebuild using `scripts/import-noc.py` with both downloaded CSV paths. Exclusion entries are not searchable aliases. Data attribution: Statistics Canada, National Occupational Classification 2021 Version 1.0; used under the [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence). This tool is not endorsed by Statistics Canada.

Search runs locally over official titles and codes. Choosing an occupation sets the CEC TEER category; title matches require confirmation against official duties. TEER 4/5 explicitly fails the CEC skilled-occupation check. Editing a search clears the old occupation and category until a new selection or manual category is chosen.
