import type { AppData } from "./domain";
export type CapturePosition = AppData["settings"]["capturePosition"];
export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export type Point = { x: number; y: number };
export const CAPTURE_SIZE = 48;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));
export function capturePoint(position: CapturePosition, bounds: Bounds): Point {
  return {
    x:
      position.side === "left"
        ? bounds.left
        : Math.max(bounds.left, bounds.right - CAPTURE_SIZE),
    y:
      bounds.top +
      position.y * Math.max(0, bounds.bottom - bounds.top - CAPTURE_SIZE),
  };
}
export function snapCapture(point: Point, bounds: Bounds): CapturePosition {
  const height = bounds.bottom - bounds.top - CAPTURE_SIZE;
  return {
    side:
      point.x + CAPTURE_SIZE / 2 < (bounds.left + bounds.right) / 2
        ? "left"
        : "right",
    y: height > 0 ? clamp((point.y - bounds.top) / height, 0, 1) : 0,
  };
}
