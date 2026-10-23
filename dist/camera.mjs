export const PLAN_FRAME = Object.freeze({ x: 0, y: 75, width: 1000, height: 500 });
export function fitMapCamera() {
  return { zoom: 1, panX: PLAN_FRAME.x, panY: PLAN_FRAME.y };
}
export function mapViewBox(camera) {
  return `${camera.panX} ${camera.panY} ${PLAN_FRAME.width / camera.zoom} ${PLAN_FRAME.height / camera.zoom}`;
}
export function zoomMapCamera(camera, factor) {
  const zoom = Math.max(0.8, Math.min(5, camera.zoom * factor));
  return {
    zoom,
    panX: camera.panX + (PLAN_FRAME.width / camera.zoom - PLAN_FRAME.width / zoom) / 2,
    panY: camera.panY + (PLAN_FRAME.height / camera.zoom - PLAN_FRAME.height / zoom) / 2,
  };
}
