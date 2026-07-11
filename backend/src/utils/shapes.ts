/**
 * tldraw shape records are large and full of editor-only fields. Reduce them
 * to the spatial facts Gemini needs, and cap the payload so a busy canvas
 * can't blow up the prompt.
 */

const MAX_SHAPES = 200;

interface ShapeSummary {
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  geo?: string;
  color?: string;
  text?: string;
}

export function summarizeShapes(
  shapes: Record<string, unknown>[]
): ShapeSummary[] {
  return shapes.slice(0, MAX_SHAPES).map((shape) => {
    const props = (shape.props ?? {}) as Record<string, unknown>;
    const summary: ShapeSummary = {
      type: typeof shape.type === "string" ? shape.type : "unknown",
      x: typeof shape.x === "number" ? Math.round(shape.x) : 0,
      y: typeof shape.y === "number" ? Math.round(shape.y) : 0,
    };
    if (typeof props.w === "number") summary.w = Math.round(props.w);
    if (typeof props.h === "number") summary.h = Math.round(props.h);
    if (typeof props.geo === "string") summary.geo = props.geo;
    if (typeof props.color === "string") summary.color = props.color;
    if (typeof props.text === "string" && props.text.length > 0) {
      summary.text = props.text.slice(0, 100);
    }
    return summary;
  });
}
