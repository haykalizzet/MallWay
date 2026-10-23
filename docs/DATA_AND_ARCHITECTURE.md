# Data and architecture

## Runtime

The site is static HTML/CSS/JavaScript. No installation or model server is necessary. Browser localStorage contains directory edits, graph, favourites, parking and history under `mallway-v1`. A service worker caches application assets.

## Data lineage

`dist/directory.json` contains the extraction date and source URL on each of the 179 shop records. Names, lots and categories follow the source; no new tenant records are generated. Basement is mapped to `B`, followed by `LG`, `G1`, `G2`, `G3`.

The official reference images were fetched from the paths used by the mall website:

- https://www.simedarbyproperty.com/malls/kleast-mall/images/map-basement.png
- https://www.simedarbyproperty.com/malls/kleast-mall/images/map-lg.png
- https://www.simedarbyproperty.com/malls/kleast-mall/images/map-g1.png
- https://www.simedarbyproperty.com/malls/kleast-mall/images/map-g2.png
- https://www.simedarbyproperty.com/malls/kleast-mall/images/map-g3.png

`dist/geometry.json` stores exact source polygon vertices per floor, transformed into the image canvas. Interactive shop outlines, selected regions and walking previews use the same official image. Famsy's directory/polygon ID mismatch is reconciled explicitly. See `MAP_PROVENANCE.md` for transformation formulas, source exceptions and provisional details.

`dist/plan-network.mjs` contains 197 source-derived nodes and 1,477 edges. The development compiler traces the grey public-concourse surface, excludes source shop polygons and rear perimeter strips, and computes collision-avoiding walking polylines. Store nodes are nearby concourse approaches, not surveyed doorways. Cross-floor bank links and parking lobby labels are provisional. Every seed node/edge has `verified: false`.

`core.mjs` clones that seed, removes inactive/unmapped-floor store nodes and applies edited directory labels. Startup migrates the old schematic seed while retaining saved favourites, history and parking notes. Imported version 2 networks can be retained. A new directory-only store needs a surveyed node; routing does not fabricate its position.

## Route model

Nodes carry id, floor, x/y canvas coordinates, name, type and verification flag. Edges carry endpoints, type, estimated metres, seconds, closure flag, optional one-way flag, verification flag and walking `path` polyline. Paths are reversed when traversed backward. Canvas coordinates align with the official images; length/time costs are indicative because the perspective plans have no measured scale.

The engine runs Dijkstra on allowed edges. Step-free mode excludes stairs and escalators. Lift preference adds an escalator penalty for path selection. Distance mode adds a floor-change penalty to walking distance; time mode uses edge seconds. Displayed travel time sums the underlying seconds, not preference penalties.

Parking recommendations evaluate the available parking nodes against the destination and sort by estimated graph journey time. No occupancy or parking reservation is inferred.

A route is labelled verified only when all traversed nodes and edges are marked verified. That is a workspace assertion; it must be supported by external field records.

## Visitor interface and manual location

Navigate, Shop Directory and My Parking are the three visitor pages. Visitors confirm their floor and nearby landmark. Update start keeps the selected destination and calculates a fresh route. Registered checkpoint links open a confirmation dialog. Sources and map limitations open in a compact dialog rather than a standalone About page.

The maintenance editor is reached separately at `?maintenance=1`. It retains directory edits, closures, network validation and backup/restore. Its URL is not an authenticated security boundary; edits are local to the current browser. The public interface contains no editor link.

Scan and Ask MallWay are removed from visitor navigation, pages and event handlers. Historical text-matching/retrieval helpers and licensed scanner assets remain packaged for compatibility and source history. They are not active visitor features. This version has no external LLM, embedding model, vector database or multimodal RAG service.

## Future shared deployment

To move beyond device-local testing: introduce authenticated editor roles and a server-side operational database; upload a surveyed navigation network; use versioned map approvals; integrate real facility status if supplied by the operator; evaluate any continuous indoor-positioning system on site. Optional generative or vector retrieval should be added behind a server API with source-grounding and evaluation, never by embedding a secret in browser JavaScript.
