# Map provenance and field validation

Updated 22 October 2026. This document distinguishes exact source geometry from provisional navigation assumptions.

## Source alignment

The five PNG plans and `mapsData.rectanglesData` shop polygons come from the official KL East Mall page:
https://www.simedarbyproperty.com/malls/kleast-mall/

The source uses Leaflet bounds `[[−1900, −2700], [1800, 4800]]`. The app displays each complete image at x=0, y=75, width=1000, height=500 on a 1000×650 canvas. Each source point `[latitude, longitude]` maps to:

- x = (longitude + 2700) / 7500 × 1000
- y = 75 + (1800 − latitude) / 3700 × 500

`dist/geometry.json` retains these transformed polygon vertices, rounded to 0.01 canvas units. The SVG hit areas use those vertices over the original image. They are not redrawn rectangular approximations. The same coordinate frame is used for routes and checkpoints.

The source contains 191 polygon records across all floors, including old listings and multi-floor tenants. All 179 current directory records have a polygon on their primary floor. Harvey Norman has a distinct additional G3 approach (`s65-G3`) so selecting it on G3 keeps that floor, while the directory retains one tenant record. Unmatched source outlines remain visible in the original image but are not presented as active directory tenants.

### Corrected source mismatch

Famsy is directory `btn200`, LG-50, but its LG polygon has source ID 97. The G1 source polygon with ID 200 is an older Chagee listing at G1-28. The compiler maps LG polygon 97 to directory `s200`, records `sourceId: "97"`, and keeps the unrelated G1 polygon as `source-G1-200`. This prevents a click on G1 from opening Famsy on LG. Multi-floor polygon collections remain separate, so an upper-floor centroid cannot overwrite a primary-floor marker.

## Concourse tracing

`tools/rebuild-plan-network.py` derives a walkable mask from the grey top surface of each source image, excluding transparent exterior, coloured shops, vertical sidewalls and every source shop polygon. Small text/pictogram gaps are closed, then the mask is eroded for clearance. Hand-traced public-concourse envelopes exclude narrow strips behind perimeter shops. Only the connected concourse component is retained.

A 2-pixel grid follows that mask. Sparse shortest-path searches penalise wall proximity and disallow diagonal corner cutting. Store nodes sit at a nearby concourse approach to the official shop polygon, chosen toward the main concourse. Paths are compressed only when consecutive points are collinear. The shipped graph has 197 nodes and 1,477 edges, with walking polylines in `dist/plan-network.mjs`.

An independent automated geometry check samples every walking polyline and confirms that it does not enter any source shop polygon. This does not prove that the traced area is currently public or unobstructed.

## Provisional details

- A concourse approach is **not an identified doorway**. Some outlines have no explicit doorway information.
- West/east lift pictograms and the central escalator are traced visually. The published images do not establish bank IDs, all stopping floors, directions, operating hours or accessibility.
- Cross-floor lift and escalator links are provisional. A walkthrough with the mall operator must establish the real connections.
- B-park-A/B/C are stable software IDs for west, inner west and east lobby approaches. They are **not official parking zones or precise car bays**. Notes can record the user's actual pillar or bay.
- The perspective images have no measured scale. The pilot uses an illustrative 0.22 m per canvas unit and 1.1 m/s walking speed; lift and escalator transfer times are assumed. Distance and time displays are indicative, not surveyed measurements.
- Every seed node and edge remains `verified: false`.

## Rebuild

Serving the app needs only Python's standard HTTP server. The map compiler additionally needs the development dependencies in `tools/map-requirements.txt`:

```sh
python -m pip install -r tools/map-requirements.txt
python tools/rebuild-plan-network.py --html /path/to/official-page.html --qa-dir /path/to/qa-output
```

Omit `--html` to fetch the official source page. Use `python tools/refresh-directory.py --write` to refresh tenant records and regenerate polygons/network together. Back up local edits before refreshing. Review image revisions, source mismatches and concourse envelopes manually after any source change; the compiler is specific to the current source structure. Runtime dependencies do not include NumPy, Pillow or SciPy.

## Before walking trials

Walk each lobby and corridor; mark actual public entrances and shop doors; establish lift banks and stopping floors; check step-free paths, security restrictions and escalator direction; replace assumed costs with measured values. Keep dated survey records before marking nodes/edges verified. Workspace verification flags are editor assertions, not independent certification.
