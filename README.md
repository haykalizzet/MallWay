# MallWay

Indoor navigation and parking assistance for malls across Malaysia.

MallWay is a web-based system intended to bring mall navigation into one platform for visitors across Malaysia. Its goal is to help people find a shop, choose a suitable parking-lobby approach, follow clear directions between floors, and return to their saved parking checkpoint.

A mall directory can show a shop's location while leaving the visitor to work out the journey. MallWay connects that shop search with the starting landmark, the correct lift or escalator, the destination floor and the final shop approach. It supports visitors planning before arrival, visitors who have already parked, and visitors starting from inside a mall.

## Product scope and current demonstration

**The product name is MallWay. KL East Mall is the demonstration location.**

| Item | Scope |
| --- | --- |
| Intended product coverage | Malls across Malaysia within one navigation platform |
| Current working demonstration | KL East Mall, Kuala Lumpur |
| Included demo data | 179 sourced directory records and five published floor-plan images |
| Current location confirmation | Visitor-selected floor and nearby shop, lift or lobby landmark |
| Additional malls | Planned expansion after obtaining and validating each mall's data |

The current build loads only the KL East Mall dataset. It does not yet provide a national mall selector or working navigation for other malls. Malaysia-wide coverage is the product goal. Each additional mall will need its own directory, map geometry, checkpoint labels, route network and field validation before it can be offered to visitors.

## How visitors use MallWay

- **Before arrival:** choose a destination and compare parking-lobby approaches by estimated journey time and walking distance.
- **After parking:** confirm the nearest lobby checkpoint, save parking details and plan a route to a shop.
- **Inside the mall:** select the current floor and a visible landmark, then follow a route to the destination.
- **After shopping:** select the current landmark and route back to the saved parking checkpoint.

The visitor interface contains **Navigate**, **Shop Directory** and **My Parking**. It uses the mall's published floor plans with clear starting and destination pins, direction arrows and named lift instructions. Saved parking, favourites, recent journeys and text preferences remain in the current browser.

## Presentation and live demonstration

`submission/MallWay_Introduction.pptx` and its PDF contain the introduction slide for a five-minute presentation. `submission/MallWay_Five_Minute_Script.txt` contains the complete timed introduction and live-demo script. The slide presents MallWay's intended Malaysia-wide scope and identifies KL East Mall as the current demonstration dataset. The longer pitch and evidence documents provide background on that demo and its validation needs.

## Start locally

No app packages, API keys or build step are required.

Windows: extract the complete project archive, open the `MallWay` folder and double-click `start-windows.bat`. Python 3.8+ is required. The launcher starts `serve.py`, opens your browser automatically, and prints the exact address in its window. Keep that window open. The default address is `http://127.0.0.1:8765/`; if that port is occupied, it chooses the next free port.

For VS Code, open the `MallWay` folder and run:

```sh
py -3 serve.py
```

If your Python installation uses `python`, run `python serve.py`. macOS/Linux users can run `python3 serve.py` or `./start.sh`.

The bundled server explicitly serves JavaScript modules, JSON and WebAssembly with the correct content types regardless of operating-system MIME settings, and disables browser caching for local files. A classic-script bootstrap displays startup/import errors instead of leaving a silent logo. No data is deleted when starting the app. Service-worker registration is skipped on loopback addresses for local development; hosted offline support remains available.

Do not open `index.html` directly with `file://`. For phone location testing, use the hosted HTTPS app. A phone's `localhost` refers to the phone itself.

## Implemented features in the KL East Mall demo

- Three starting situations: before arrival, already parked, inside mall.
- 179 sourced directory records across Basement, LG, G1, G2 and G3.
- Search by name or lot; category/floor filters; favourites.
- Basement lobby approach comparison using routes through the graph; availability explicitly unknown.
- Dijkstra routing across corridors and vertical connections.
- Step-free routing excludes stairs/escalators; optional lift preference.
- Lowest estimated-time and walking-distance-with-transfer-penalty strategies.
- Routes over the original official plans, floor switching, mouse/touch pan, wheel/pinch zoom, fit and expanded map.
- Dark navy/forest theme, larger controls and persistent extra large text setting.
- Clickable source shop polygons and a readable list of shops on each floor.
- Consecutive segments on the same lift are presented as a single lift ride.
- Exact source polygon vertices over all five official floor-plan images, with source ID reconciliation.
- Approximate mall suggestion using browser geolocation, with user confirmation.
- Three visitor pages: Navigate, Shop Directory and My Parking.
- Manual floor-and-landmark selection; Update start preserves the destination and recalculates.
- Saved parking with vehicle reference, notes and timestamp.
- Return route to saved parking; recent journeys.
- Optional browser speech for current instruction.
- Route printing and JSON download.
- Separate local maintenance editor at `?maintenance=1` for directory records, closures and network JSON.
- Printable checkpoint links that open a landmark confirmation, without an in-app scanner.
- Validated workspace backup/restore.
- App manifest and service-worker caching.
- Responsive desktop/mobile interface and keyboard-accessible controls.

## Data boundaries — read before presenting

Shop names, lots, categories and the five reference map images were obtained from:

https://www.simedarbyproperty.com/malls/kleast-mall/

Retrieved 22 October 2026. The source itself may contain old listings or category inconsistencies. Refresh and verify before deployment.

**Shop outlines match the published source geometry. Navigation remains provisional.** Concourse paths are traced from the same images and avoid all source shop polygons. Store nodes identify nearby concourse approaches, not actual doorways. Cross-floor lift-bank links, public access, parking approaches, distances and timings need on-site validation. Every seed node/edge remains unverified.

B-park-A/B/C are stable software IDs for west, inner west and east lobby approaches. They are not official parking zones or exact car bays. The images are perspective plans without measured scale, so metre/time displays use an explicitly indicative scale and assumed transfer costs. See `docs/MAP_PROVENANCE.md` for full lineage and rebuild instructions.

GPS can suggest proximity to the mall, but cannot reliably resolve the indoor floor, corridor or parking bay. The app requires a confirmed floor, shop or parking-lobby checkpoint. Step confirmation advances the display; there is no continuous moving-position tracker or automatic deviation detection.

The visitor interface has no Scan, Ask MallWay, Workspace or About page. Sources and map limitations open in a small dialog. OCR/QR decoding and the directory assistant are outside the current visitor experience. Historical matching/retrieval helpers and vendor assets remain in the source package, with required notices. There is no deployed LLM, multimodal RAG, live indoor tracker or model API key.

This is a browser-local testing system, not a multi-user backend. It has no user accounts, server database or protected administrator role. Open `http://127.0.0.1:8765/?maintenance=1` (or append `?maintenance=1` to the hosted URL) for local map maintenance. This separate entry point is not an authenticated administrator boundary. Editor changes affect only that browser. QR links identify nodes but do not copy one device's edited network to another; import a backup on the other device.

## Verification

With Node 20+ installed:

```sh
npm run check
npm test
```

Tests cover every store's reachability, accessible routes, lift-closure rerouting, disconnected networks, parking ranking, return journeys, one-way edges, OCR text matching and malformed network rejection. The geometry checks also confirm all current entries have primary-floor source polygons and sampled walking polylines do not enter source shop interiors. They verify software behavior and source alignment, not real-world public access or actual mall route accuracy.

See `docs/TESTING_GUIDE.md`, `docs/DATA_AND_ARCHITECTURE.md` and `docs/DEMO_SCRIPT.md`.

## Folder structure

```text
dist/                 Hosted site; also serves independently
  app.mjs             Visitor pages, manual origins, browser storage and maintenance
  navigation.mjs      Direction arrows, per-floor walking paths and lift markers
  core.mjs            Seed loading, route engine, matching and retrieval
  geometry.json       Per-floor exact official shop polygon vertices
  plan-network.mjs    Plan-derived walking polylines and provisional floor links
  directory.json      Sourced tenant records
  assets/             Official reference plans and vendored scanner assets
  sw.js               Offline cache after first visit
docs/                 Manual, demo script and data/architecture notes
tests/                Node's built-in test runner; no install required
tools/                Directory refresh and reproducible plan compiler
```

## Offline behavior

The initial visit needs network access. Core pages and reference maps are precached after the first hosted visit. The interface uses installed system fonts and does not depend on external font requests. Browser quota, private browsing and service-worker support can affect persistence/caching.

## Third-party attribution

- Directory and floor-plan images: KL East Mall / Sime Darby Property. Retained with source attribution for this prototype; this package does not grant additional reuse rights to those materials.
- Tesseract.js and tesseract.js-core: Apache-2.0; upstream notices retained where distributed.
- English trained data: Tesseract language data, Apache-2.0.
- jsQR: Apache-2.0.
- qrcode-generator by Kazuhiko Arase: MIT; source notice retained.
- Font stacks fall back to installed system fonts.

No third-party mall endorsement or integration is implied.

## Basement and ZIP packages — 2.0.1

Fit floor plan now uses the entire published image frame (0,75,1000,500), including its outer edges. Floor changes and the Fit control reset to this complete frame. Open full plan opens the original PNG separately, without route overlays. The published B image contains a largely blank floor surface with service lots and lift pictograms; it does not contain parking bay rows, ramps or drive aisles. Those details have not been removed by MallWay.

- `mallway-source.zip`: full editable project; extract, then open its `MallWay` folder in VS Code. Double-click `start-windows.bat`, or serve its `dist` folder using Python.
- `mallway-web.zip`: static web files directly at the ZIP root, with `index.html` alongside `assets/`. For hosts that accept a website ZIP, use this package. For drag-and-drop folder hosting, extract it and upload the extracted folder. For hosts that build source repositories, use the full project and set the publish directory to `dist` with no build command.
- `mallway-code.txt`: readable first-party source and documentation for services that accept text attachments but block ZIPs. It omits binary images/models and vendored libraries; use a ZIP to run the complete application.

These are standard unencrypted DEFLATE ZIPs with simple ASCII paths. A platform may still prohibit ZIP uploads; file packaging cannot override the destination's accepted-file rules.

## If startup stops — 2.0.2

1. Close the previous server window.
2. Extract the latest source ZIP to a new folder.
3. Run the new `start-windows.bat` inside `MallWay`.
4. Use the address it opens; do not reuse the old `localhost:8000` tab.
5. If the app displays a startup error, expand Technical details and share that text. The exact cause on a user's computer cannot be established without that error or the server log.

The download includes `serve.py`; the website-only ZIP still requires a web host that serves `.mjs` as JavaScript.

## Clearer navigation — 2.1.0

The original floor images and source coordinates are preserved. A blue start pin and red destination pin use dark, readable name/floor labels. Walking routes have a thick blue stroke, white halo and repeated white arrowheads in the actual travel direction, including return journeys. Selected lifts/escalators use amber badges and boarding/exit labels; other facilities use slate badges. Marker sizes stay readable as the map zooms. Label placement avoids marker icons and walking lines where space permits; off-screen markers do not leave orphaned labels at the map edge.

Lift steps name the bank, boarding floor, floor button to select, and exit floor. The boarding map remains visible until the visitor confirms reaching the exit floor. Board/Exit controls preview either floor without advancing progress. Intermediate lift stops do not generate false walking lines. Focus route zooms to the current floor's route; Fit floor plan still restores the complete published image, including B. Co-located checkpoint icons use a tether back to their shared map coordinate.

These are confirmed checkpoint markers, not a live GPS position. Pin tips identify plan-derived approaches; actual doors and lift-bank service still need field validation.

## Repository and submission materials

`CHANGELOG.md` summarises the recorded revisions. `.github/workflows/checks.yml` runs formatting, syntax, navigation and local-server checks on GitHub. Optional developer formatting uses `npm ci`, then `npm run format:check` or `npm run format`.

The `submission` folder contains the editable pitch, evidence report, proposed field-validation kit and blank data-collection CSVs. The field materials contain no completed visitor study or claimed performance gain. See `docs/GITHUB_SETUP.md` to upload the retained history to a new GitHub repository. Visitor parking notes and journey history remain browser-local.

## Visitor flow simplification — 2.2.0

The primary navigation now contains Navigate, Shop Directory and My Parking only. Manual floor/landmark controls replace every scan shortcut. Update start keeps the selected destination and recalculates the journey. Sources and map notes remain available in the footer and header information dialog. The local maintenance editor remains at `?maintenance=1`, outside visitor navigation. Existing saved data uses the same browser-storage key. Official geometry, full Basement framing, pins, arrows, lift guidance, step-free preferences and Windows startup remain intact.

## Product positioning update — 2.2.1

MallWay is the Malaysia-wide product concept. KL East Mall identifies the current demo dataset, not the product name. The browser title, app manifest, demo labels, presentation introduction and README now use this distinction. Routing behavior, saved-data keys and the included KL East Mall map geometry remain the same.
