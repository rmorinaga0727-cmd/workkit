# WorkKit release: 2026-10-31 / D001

Owner instruction: restore FUTURE-WORKKIT-V1.1-20261023 (33 approved files), preserve diagnosis V3 and sales script, integrate local-rule-composition-20261031-v1 objection app. Five other tools remain unavailable as 大幅アップデート中. New paid-service intake stays paused.

Branch: release/workkit-three-tools-20261031. Production target: existing Cloudflare Pages workkit-shigoto, https://workkit-shigoto.pages.dev/. GitHub Pages settings and unrelated working tree remain unchanged.

Validation: 92 release browser checks and 293 approved objection checks passed. Original home/content manifests verified; 30 home assets and all objection engines preserved byte-for-byte. Existing production 33 files backed up and verified against approved originals, allowing only existing Cloudflare Analytics injection. No paid API added.

Released: 2026-10-31T15:00:32.043040+00:00 (2026-11-01 JST) to https://workkit-shigoto.pages.dev/.
Cloudflare deployment: 59d5f5f0-6a67-4b2d-a47b-140c00be41b6; published source commit: 4ff224fa59562823028ee97afb768476237aa774.

Post-release validation: 97 integration checks, 293 objection checks, 51/51 public file hashes (excluding existing Cloudflare Analytics injection), saved diagnosis/reflection preservation, and decoded character images at desktop/mobile widths all passed. No runtime/console errors or missing release assets observed. Three tools public; five updating tools blocked; paid-service intake paused. Mobile checks use Chromium device/viewport emulation; physical devices remain unverified.

Original approved assets and the owner's original dirty working tree were verified unchanged against the pre-task backups. GitHub main and GitHub Pages settings were not changed. Source is retained on the separate release branch. Final report and screenshots: RM/01_WorkKit/release_20261031_d001_three_tools/FINAL-REPORT.md.

Work stopped for C000 / owner review of the released result. No unrelated RM memory, formal progress DB, SNS, or other-business updates performed.


### D001 WorkKit forecast V2 local enhancement 2026-11-21
- Isolated checkout on feat/forecast-dashboard-v2-20261120, baseline 3971d1dbca74017f9b025fc66668e08e06728ba9. Original WorkKit checkout dirty worktree and dev/workkit-setup remain untouched. No main merge, push, deployment or paid API.
- tools/forecast: import-core, import-worker, interpret-worker, import-ui, motion, analytics added; index.html, app.js and style.css extended. Original calculation/validation/reverse planning functions retained. SheetJS 0.20.3 and PDF.js 5.4.624 vendored with licenses.
- CSV/TSV (UTF-8, Shift-JIS), Excel multi-sheet, and text PDF preview -> editable mapping/aggregation -> explicit replace/undo. Dates are decoded from Excel serials to avoid timezone shift. Daily/cumulative modes, warnings, filters and repeated-import protection. Import parse/aggregation run in Workers. Existing browser save, report and CSV output retained.
- Real day/week/month imported history, funnel/CVR bottlenecks, CVR slider and up to eight saved comparison scenarios. Number/gauge/bar/path transitions, spring navigation, upload state, scroll/pointer/selection feedback, reduced-motion and keyboard support. Rule-based analysis is labelled; AI disconnected.
- Validation artifacts and scripts: parent folder evidence/results.json, extra-results.json, qa.cjs, verify-extra.cjs, visual-review.cjs. Includes PC/mobile Chromium operations, original V2 calculation comparison, CSV/XLSX/PDF, corrupted input/cancel/undo/persistence, Shift-JIS and Asia/Tokyo date regression, 40k-row responsiveness, reduced motion, screenshots and videos. Run pure tests: node --test tools/forecast/tests/import-core.test.cjs.
- Preview: run parent preview.cmd, then open http://127.0.0.1:8890/tools/forecast/. Stop with Ctrl+C. HTTP is required for Workers/modules. No deployment is needed.
- Limits: no OCR/scanned PDF; PDF columns require manual verification and pages are handled independently; arbitrary reports are not guaranteed. 15MB, <50k rows, 120 columns, 50 sheets/pages. Review days/member count/CVR after import. No invented daily target allocations. Physical mobile/Safari/Firefox and sustained 60fps are unverified; headless frame samples in evidence. P2 margin/product/pipeline-aging/AI integration remain future scope.
- Formal task ID not identified and authorized local task service unavailable; no unrelated task updated. Candidate for owner review, not formal completion. Organization policy/Skills unchanged; project requirements and validation preserved in local report and regular work outcomes.

- Final safety correction: preserve plan CVRs only when both adjacent stage names match. New connections require explicit plan CVR input before confirmation; previous-stage-to-different-next-stage rates are never silently reused. Regression also covers BIFF XLS and invalid-PDF nonmutation.


### D001 / V001 WorkKit forecast V3 local review candidate 2026-11-21
- Owner V3 request retained in ../v3/owner-request.txt. Existing V2 work in progress preserved in ../v3/baseline with full SHA256 baseline manifest before isolated staging. Dev branch/head unchanged; no main merge, push, deployment, paid API or public-three-tool source changes.
- tools/forecast: INPUT -> real Worker ANALYZING -> INTELLIGENCE REPORT, conclusion and three evidence-based actions first. Existing V2 forecast/reverse formulas extracted unchanged to engine.js; parser/vendor assets retained. Adaptive day/week/month/year data, weighted CVR, quarter/year/custom/YoY comparisons, conditional dimension/pipeline analysis, A/B/C simulation and time assumptions, browser-local diagnosis/action history, data navigator/template, CSV/text/print output.
- CSV/TSV UTF-8/Shift-JIS, XLS/XLSX and text PDF only. Explicit mapping, cumulative/period semantics, target unit, days and people confirmation. Invalid/future data and cancel do not overwrite previous valid storage; demo is fictional and does not replace real saved inputs.
- Motion: real processing phases, spring choice, route/reveal/number/gauge/bar/path/tooltip/slider feedback. Reduced-motion and mobile lighter rendering. No fictitious AI processing or fabricated progress delays.
- Tests: 26 portable unit tests; 22 browser groups, five additional regressions, two Excel grain checks; 40k-row Worker/cancel/frame checks; fixed-viewport desktop/mobile motion recording/replay; real 8890 host HTTP 17 assets and Chromium input->demo->report pass. See ../v3/report.html and ../v3/evidence/*.json. Physical devices, Safari/Firefox and universal 60fps not verified.
- Performance measured without recording: 40k import ~5.70s; report Worker/UI ~1.55s; slider median 16.7ms, p95 18.1ms; maximum observed timer gap ~539ms remains during the large-data lifecycle. Offscreen section containment reduces layout cost, but full-page capture can show unpainted offscreen placeholders; normal viewport screenshots are review evidence.
- Preview: double-click parent preview.cmd, open http://127.0.0.1:8890/tools/forecast/. Detached server survives launcher closure and repeated launches reuse it. Stop with parent preview-stop.cmd (supersedes earlier Ctrl+C guidance). Restart preview.cmd after reboot. No startup/login task installed.
- Limits and simplified scope: counts-based KPIs; no OCR/currency/profit model/cloud-sync/share-link/cross-file case merge; monthly partial slicing prohibited; continuous cumulative growth withheld; seasonal reference requires 36 complete months; graph latest 120 intervals, segment table/suggestions 200, browser history/scenarios eight. Spatial zoom/pan uses period/custom-range selection instead. Full limits in report.
- Regular workflow outcome recorded separately; formal task ID not identified, authorized task service unavailable/access denied, formal progress not applied. This is a local review candidate, not owner formal completion. Organization memory/Skills need no policy update; this project note and report hold operation/validation evidence.


### Local development preservation 2026-11-25
- Existing feature branch retained. Runtime sources, vendored licenses, nine regression test files and three synthetic CSV fixtures are versioned locally. Application bytes are unchanged by this preservation task.
- Start the existing preview with ../preview.cmd and use http://127.0.0.1:8890/tools/forecast/. Stop with ../preview-stop.cmd.
- Current browser harness: ../quality-20261124/browser.cjs. It still uses its stage/vendor copy, ../v3/test-server.cjs, the established Playwright installation and three Downloads CSVs; preserve these dependencies until the cleanup proposal is approved.
- The original local development record and necessary preview/validation dependencies are retained in the existing RM environment audit recovery record, outside Git.
- This is local version preservation only: no main merge, push, release, feature change or cleanup-rule deployment.
