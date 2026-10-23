# Verification record — MallWay 2, 22 October 2026

## Automated checks

`npm run check` passes syntax checks for the app, core, service worker and generated plan network.

`npm test` passes all 14 cases:

1. Each of the 179 current tenants has a primary-floor source polygon. Famsy's source ID mismatch is corrected; Harvey Norman has a separate G3 approach.
2. Every walking polyline joins its node coordinates and sampled points remain outside every source shop polygon on that floor.
3. Forward and return routes retain polylines across all retail floors.
4. Imported out-of-bounds/non-numeric path geometry is rejected.
5. Every sourced directory record is reachable from the parking pilot.
6. Step-free routes exclude stairs/escalators for all current tenant destinations.
7. Closing west lift links reroutes via east; closing all lift links makes accessible travel fail safely.
8. Parking approaches are reachable and ranked by estimated graph time.
9. Return instructions finish at the saved parking checkpoint.
10. Unknown origins and isolated destinations fail safely.
11. Sign text resolves known names/lots and rejects unsupported matches.
12. Directory retrieval returns source-bearing records.
13. Malformed graphs reject duplicate IDs, missing endpoints and negative costs.
14. Same-checkpoint and one-way-edge behaviour is correct.

The source compiler was rerun successfully on the captured official page. Final seed: 197 nodes, 1,477 edges, 179 tenant records with one additional multi-floor approach. Python helper syntax was checked.

## Interactive preview checks in this revision

- Dark desktop layout, larger controls and original floor-plan images render.
- A source shop polygon opens readable information and destination actions.
- Parking-to-A&W routing generates a route on the same official plan, including a lift instruction and floor transition.
- Zoom + changes the map camera and percentage; source plan remains the backdrop.
- Aa enables extra large text; the setting remains after reload.
- A 390-pixel phone-width iframe visually shows the stacked planner, larger text and bottom navigation. Expanded map layout was also inspected. This is layout inspection, not a physical-device sensor/touch certification.
- Actual image QR decoding returns MW:B-park-A and the West lobby approach.
- Actual on-device Tesseract OCR recognises ABSOLUTE THAI / G1-22 from the labelled sample and returns the correct shop.
- Accepting the OCR result sets the indoor origin to Absolute Thai on G1.
- The readable G3 shop list selects Harvey Norman's G3 node, and the route finishes on G3 rather than the directory's primary G2 floor.
- The saved parking checkpoint survives the geometry migration.
- A return route from Harvey Norman on G3 reaches the saved West lobby approach in B.

## What these checks do not prove

Public access, real shop door positions, lift-bank stops, escalator direction, distances, parking bay labels and accessible travel have not been surveyed. Source-aligned outlines and collision-avoiding lines do not establish current real-world access.

Real phone camera/geolocation permissions, varied real sign photographs, physical touch/pinch performance, field outcomes and live parking/facility status remain unvalidated. The successful OCR input is a synthetic sample, explicitly labelled in the UI. Speech/printing depend on browser support.

The system remains a single-browser prototype with local storage. It has no shared authenticated administration database, production indoor-positioning service or deployed LLM/RAG backend.

## 2.0.1 — Basement framing and attachment packages

The full PNG was intact. The old camera used a cropped 900×450 frame at (50,100), while the image occupies 1000×500 at (0,75). The fit camera now includes the complete image, with explicit SVG aspect-ratio containment. The route geometry coordinates have not changed.

The test suite now passes 16 cases, including source-image corner containment and recovery after zoom/pan. Interactive preview checks confirmed B zoom followed by Fit yields `0 75 1000 500`, and switching G1 → B resets to that same full frame. The Basement source note and Open full plan link render. The source image itself does not show parking-bay rows, ramps or drive aisles.

`tools/package-downloads.py` creates a full source ZIP, a website ZIP with `index.html` at its root, and a readable text source bundle. It checks ZIP CRCs, standard unencrypted DEFLATE compression, ASCII member paths and required map/OCR assets. Acceptance by a particular upload platform still depends on that platform's file rules.

## 2.0.2 — Local startup and Windows launcher

The previous batch file ran Python's general-purpose HTTP server. Its module content types can depend on system mappings; a rejected static import occurred before the app's own startup catch, leaving only the logo. This is a reproduced failure mode, not a confirmed diagnosis of the user's computer.

The replacement `serve.py` uses explicit JavaScript, JSON and WebAssembly MIME types, a loopback address, port fallback and no-store HTTP caching. The Windows batch file detects Python 3.8+, validates extraction through the server, and opens the exact available address automatically. The default origin is now 127.0.0.1:8765 instead of localhost:8000. Hosted offline support remains; loopback development skips new service-worker registration.

All 16 existing JavaScript tests pass. Three Python tests also pass: real HTTP responses under deliberately incorrect system MIME mappings; occupied-port handling; incomplete-extraction diagnostics. Python source syntax and all JavaScript syntax checks pass.

Browser preview loads the full application through the classic bootstrap and dynamic import. A temporary missing-module fixture displays the recovery message and Technical details control; it no longer remains at the logo. The fixture was removed before packaging. This environment cannot execute Windows .bat files directly; Windows launcher behaviour was reviewed, while its Python server was exercised over real HTTP.

## 2.1.0 — Visible directions and lift guidance, 23 October 2026

All 21 JavaScript tests and three local-server Python tests pass. JavaScript syntax and whitespace checks pass. Five new regression cases cover forward/reverse arrow direction, named lift boarding/exit floors, downward return rides, walking-path separation at floor transfers, and the alternate bank selected after a closure. Complete-source-image fit remains covered.

Interactive preview checks confirmed Absolute Thai routing from the West lobby approach, the B boarding map after Confirm my start, separate Board B / Exit G1 floor previews, and a G1 blue walking route terminating at the red destination approach. Focus route enlarges the path while marker names keep a fixed screen size. Expanded desktop and 390-pixel iframe layouts were inspected. Narrow-view clutter was reduced to the route's selected connectors and start/destination markers; labels have separate placement and co-located pins/lifts have a tether. Keyboard activation of the amber lift icon opens the named-floor dialog, its exit action closes the dialog on G1, LG correctly says stay in the lift, and confirming arrival advances to the G1 walking instruction. These are layout/interaction checks, not physical phone sensor or touch validation.

The official source images, tenant polygons and route coordinates are unchanged. Navigation is still a plan-derived prototype with manually confirmed checkpoints, unverified doors/lift links and estimated distances. No continuous location tracker has been added. Windows/local-startup recovery fixes from 2.0.2 remain included.


## 2.1.1 — Repository preparation and submission material

First-party source now uses consistent formatting. JavaScript syntax trees were compared before and after formatting, ignoring source locations, comments and equivalent quoted property names. Runtime behaviour remains unchanged. Explanatory first-party comments were removed; third-party assets and licence notices remain unchanged.

All 21 JavaScript tests, three Python server tests, syntax checks and formatting checks pass locally. Interactive preview still loads and creates the B-to-G1 Absolute Thai journey, keeping the boarding instruction on B. The repository contains a GitHub Actions workflow; no remote CI result is claimed before GitHub runs it. The pitch and support reports distinguish implementation results from untested visitor outcomes.

## 2.2.0 — Visitor navigation simplification

The current visitor interface contains only Navigate, Shop Directory and My Parking. Earlier OCR and assistant observations above describe historical revisions; those pages and their visitor handlers have been removed. Historical matching/retrieval helper tests and licensed vendor assets remain packaged.

Browser checks on 23 October 2026 confirmed:

- Floor selection on G2 exposes G2 landmarks, with no scan shortcut.
- A step-free route to Absolute Thai retains named lift and floor guidance.
- Update start changes the origin to a chosen Basement lobby while preserving Absolute Thai as the destination and recalculating.
- A saved parking note appears in My Parking; a return route from Absolute Thai uses G1 → B and the saved lobby.
- Sources and map notes open a dialog with official references and map limitations, without an editor link.
- `?maintenance=1` opens the existing local editor independently of visitor navigation. This is not an authenticated role.
- A registered checkpoint URL asks for confirmation before setting the correct parking origin.
- A 390-pixel iframe check confirms three readable bottom tabs; directory search and route calculation work with keyboard activation. This is responsive-layout testing, not a physical-phone trial.
- The 12-slide PPTX and PDF, four-page problem report and three-page field kit were rendered and visually reviewed.

The existing 21 JavaScript tests and three Python startup cases pass, alongside syntax and formatting checks. They do not validate physical mall access, real GPS accuracy or visitor outcomes. No new field study or GitHub Actions run is claimed.

## 2.2.1 — MallWay product scope and demonstration

MallWay identifies the product intended for malls across Malaysia. KL East Mall remains the only dataset loaded by the working demo. Browser checks confirmed the Malaysia product title, the KL East demo badge, and the location dialog explaining that additional mall datasets are not yet connected. The app manifest uses MallWay as the name. The source README, expanded single introduction slide and timed script use the same distinction. No national mall selector or additional route dataset was implemented in this revision. The 21 JavaScript cases and three Python startup cases passed again.
