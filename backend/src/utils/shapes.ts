/**
 * tldraw shape records are large and full of editor-only fields. Reduce them
 * to the spatial facts Gemini needs, and surface every text annotation with
 * its canvas position so labels and gameplay notes reach the model.
 */

const MAX_SHAPES = 200;
const MAX_ANNOTATIONS = 100;
/** Generous cap so long instructions still reach the model. */
const MAX_TEXT_CHARS = 500;

export interface ShapeSummary {
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  geo?: string;
  color?: string;
  text?: string;
}

export interface TextAnnotation {
  x: number;
  y: number;
  text: string;
  /** Shape kind that carried the text (text, note, geo, arrow, …). */
  source: string;
}

/** Walk tldraw richText / plain text props into a single string. */
export function extractPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const node = value as { text?: unknown; content?: unknown[] };
  if (typeof node.text === "string") return node.text;

  if (Array.isArray(node.content)) {
    return node.content.map(extractPlainText).join("");
  }

  return "";
}

function shapeText(props: Record<string, unknown>): string {
  if (typeof props.text === "string" && props.text.length > 0) {
    return props.text;
  }
  if (props.richText) {
    return extractPlainText(props.richText);
  }
  return "";
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

    const text = shapeText(props).trim();
    if (text.length > 0) {
      summary.text = text.slice(0, MAX_TEXT_CHARS);
    }
    return summary;
  });
}

/**
 * Every non-empty text label on the canvas, with position. Includes free text,
 * sticky notes, and labels written inside geo/arrow shapes.
 */
export function extractAnnotations(
  shapes: Record<string, unknown>[]
): TextAnnotation[] {
  const annotations: TextAnnotation[] = [];

  for (const shape of shapes) {
    if (annotations.length >= MAX_ANNOTATIONS) break;

    const props = (shape.props ?? {}) as Record<string, unknown>;
    const text = shapeText(props).trim();
    if (!text) continue;

    const type = typeof shape.type === "string" ? shape.type : "unknown";
    annotations.push({
      x: typeof shape.x === "number" ? Math.round(shape.x) : 0,
      y: typeof shape.y === "number" ? Math.round(shape.y) : 0,
      text: text.slice(0, MAX_TEXT_CHARS),
      source: type,
    });
  }

  return annotations;
}
