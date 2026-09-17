# PR Score

Dependency-free, responsive Express Entry calculator. Serve `dist/` with any static HTTP server; `npm start` serves it on http://127.0.0.1:4173. Run `npm test` for rule tests and `npm run check` for JavaScript syntax checks.

## Structure

- `dist/express-entry.js`: pure CRS and CEC/FSW/FST screening functions, official source links, test-equivalence tables, and initial profile.
- `dist/systems.js`: scoring-system registry. Each adapter supplies `id`, `name`, `version`, `maxScore`, `defaults()`, `calculate(profile)`, `eligibility(profile)` and sources. Add OINP or Australia 189/190 as independent adapters with their own profile schema and UI; these systems are not implemented yet.
- `dist/app.js`: accessible live form and result rendering. No backend or stored applicant data.
- `tests/scoring.test.js`: reference scenarios, caps, boundary and eligibility checks.

## Rule snapshot and interpretation

Official IRCC sources were reviewed September 16, 2026. Links are in the application and rule module. Maintain the rules and conversion tables as government criteria change. No CRS job-offer points are awarded. The engine compares both language orderings, including transferability, and chooses the higher total; ties use English. Spouse language uses the higher-scoring complete language, never a mixture of abilities. No-valid-test selections contribute zero regardless of retained benchmark levels. TEF mappings use previous-score equivalencies, not scores out of 699.

CRS and eligibility are separate. Eligibility uses explicit confirmations for qualifying work, funds and settlement intentions because CRS experience alone does not establish program-specific time windows or conditions. FSW uses a separate 100-point selection grid and adaptability cap. Positive results say “Likely eligible” and remain conditional on truthful confirmations, admissibility, documentary evidence and current IRCC rules. Exceptional public policies are not adjudicated by this tool. The CRS is an estimate even when program requirements are not met.

Tests are selected as already valid (under two years), rather than collecting test dates. ECA validity is self-confirmed (under five years). Test scores are reference equivalents; the input is CLB/NCLC. All four abilities are independent. CLB/NCLC 10 and above share one scoring band.

The browser exposes an optional read-only WebMCP tool, `read_express_entry_estimate`, using the same visible profile and results.
