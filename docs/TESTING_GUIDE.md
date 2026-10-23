# MallWay 2 testing guide

Use the hosted HTTPS app for phone location tests. Locally, run `start-windows.bat` or `python serve.py`, then use the address printed by the launcher (normally `http://127.0.0.1:8765/`). Browser data stays on that device.

## 1. Plan before arrival

1. Open Navigate → Plan a visit.
2. Search for Absolute Thai and choose the directory result.
3. The G1 official plan highlights the actual source shop outline. The destination marker is a concourse approach, not a surveyed doorway.
4. Inspect the suggested basement lobby. Expand Compare other approaches to choose an alternative. No parking occupancy is reported.
5. Enable Step-free route, or expand More route preferences for lift preference and route priority.
6. Select Find my route. Confirm each checkpoint to advance through the floors.
7. Use the floor buttons to inspect each plan, and Show current instruction floor to return to the next instruction.
8. Hide route removes only the route overlay; it keeps the same official plan. Show route restores it.

Expected: no separate rectangular schematic; routes and source polygons share one coordinate frame. Times/distances remain labelled estimates and field-verification guidance is visible.

## 2. Already parked

1. Select I’ve parked and choose a lobby approach near your car.
2. Pick a shop and calculate a route.
3. Save parking from the route, or use My parking to add a vehicle reference, pillar/bay number and notes.
4. Refresh and verify that the saved parking remains available.
5. In My parking choose a current landmark, then Route to saved parking.

Expected: the route returns to the saved lobby approach, not to an invented exact car bay. B-A/B-B/B-C are pilot checkpoint aliases.

## 3. Already inside

1. Select I’m inside.
2. Choose the current floor, then the nearest shop or lift landmark.
3. Search for a destination on another floor and calculate.
4. Confirm checkpoint to progress through the instructions. The map switches to the instruction's floor.
5. Instead of the selectors, tap a shop polygon and choose I’m here. Confirm the floor matches the sign in front of you.

Expected: location comes from your confirmed landmark. Indoor floor detection and continuous tracking are not simulated.

## 4. Map and readability

- Tap a shop outline: the modal shows its name, lot and category with I’m here / Go here actions.
- Check LG Famsy opens LG-50, rather than an old G1 Chagee polygon.
- Drag with a mouse or one finger to pan. Use scroll, +/− or a two-finger pinch to zoom. Fit floor plan resets the camera.
- When the SVG itself is focused, arrow keys pan, +/− zoom, and 0 fits the plan. Tab reaches individual source shop outlines; Enter/Space opens a shop.
- Browse shops on this floor provides a larger text alternative to small printed lot labels.
- Expand map opens a larger map workspace; its close button returns to the page.
- Aa toggles extra large text and persists after refresh.
- At phone width, the planner and map stack vertically and a bottom navigation bar remains available. Zoom the map or expand it to inspect small source labels.

## 5. Update the current location

1. Create a route to Absolute Thai, then select Update start.
2. Choose another floor. The landmark list must contain only that floor’s shops, entrances, lifts and parking approaches.
3. Choose a landmark and confirm. The dialog closes, the destination remains Absolute Thai and a new route starts from the selected landmark.
4. Cancel a second update. The existing route must remain unchanged.
5. Open a registered `?checkpoint=B-park-A` link. Confirm the correct floor and landmark before accepting it as a start.
6. Sources & map notes must open a dialog, with source links and no editor link. Public navigation must contain only Navigate, Shop Directory and My Parking.

## 6. Workspace and closures

1. Open `?maintenance=1` separately. This is a browser-local editor, not a protected administrator account. Export a workspace backup before editing.
2. Maintenance → Connections: close the west lift connection. Recalculate a step-free route and check it can use the east lift.
3. Close all lift links to a target floor. A step-free route should fail clearly rather than using stairs/escalators.
4. Reopen all connections.
5. Export/import Network JSON. Invalid IDs, costs, endpoints or path coordinates must be rejected.
6. Edit a directory name/lot; the route node should use the changed text. New shops or changed floors need surveyed nodes before routing can work. Changing topology resets seed graph edits, as stated in the editor.
7. Restore a backup. Version 1 schematic backups upgrade to the new source-derived network while retaining directory/saved items. Export the current workspace first.

## 7. Other checks

Test directory filters/favourites, saved journey replay, speech (if supported), print preview and JSON downloads. External links open separately. Geolocation permission denial must leave manual starting points usable.

Offline: visit the hosted app while online, then use browser offline mode and reload. Browser storage quotas and service-worker support can affect the result. A first-ever visit requires network access.

Automated checks: `npm run check` and `npm test`. These validate the software and source alignment; they do not replace an on-site survey.

## Basement fit regression — 2.0.1

Select B, zoom in, then Fit floor plan. Confirm the SVG viewBox is `0 75 1000 500` and all four image edges fit in the viewport. Switch from B to another floor and back: the complete frame should reset. Repeat in expanded view and at narrow width. Open full plan must open `assets/plan-B.png`, showing the same published floor image independently of overlays. Empty parking space in the official B image is source content, not a failed download.

## Local startup regression — 2.0.2

Run `python -m unittest discover -s tests -p test_local_server.py`. This reproduces an incorrect system MIME mapping, verifies the custom server returns JavaScript/JSON/WASM content types on real HTTP responses, checks port fallback and confirms incomplete extraction produces a useful error. Browser startup failures must show a recovery message and technical details, rather than leaving the logo indefinitely.

## Navigation clarity regression — 2.1.0

1. Plan a visit → Absolute Thai → Find my route. Verify the blue START CHECKPOINT pin and amber USE THIS LIFT label on B.
2. Confirm my start. The map must remain on B and say Use West lift lobby: B → G1, with Select G1 inside the lift.
3. Use Exit G1 to preview G1. Expect an amber EXIT LIFT marker, red DESTINATION pin with Absolute Thai / G1-22, and a thick blue walking line with white arrows from the lift towards the destination. This preview must not advance the instruction counter.
4. Focus route, then zoom +/−. Pins and marker text retain their screen size. Fit restores the full floor. Labels should not sit on the walking line; off-screen facilities should not leave floating labels.
5. Click the amber lift icon. Its dialog names the same bank/floors and provides Show boarding step and Show exit on G1. Either action closes the dialog and displays the requested floor.
6. Close expanded map if open. Select I’ve reached G1. The next walking instruction and map should both be G1.
7. Inspect LG during the B → G1 lift ride: the banner says stay in the lift until G1 and no walking segment is drawn on LG.
8. Check the return journey G1 → B. The lift floors and arrows must reverse correctly. Closing the west lift must show the east bank actually selected by routing.

Automated direction tests cover path orientation, merged lift bank/floors, return journeys, separating walking paths at transfers and closure-selected bank labels. All real-world access limitations still apply.
