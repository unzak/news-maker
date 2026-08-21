import {
  BASELINE_CENTER,
  CANVAS_H,
  CANVAS_W,
  COLOR_BG,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  INSET_RING_MIN,
  INSET_RING_RATIO,
  LINE_RATIO,
  OVERLAY_Y,
  PHOTO_H,
  TEXT_MAX_W,
  TEXT_SAFE_BOTTOM,
  TEXT_SAFE_TOP,
} from "./format.js";

/** Un trozo de texto con su color. El texto entre *asteriscos* va resaltado. */
export interface Segment {
  text: string;
  highlight: boolean;
}

export interface PhotoTransform {
  /** 1 = encaje "cover" justo. Mas de 1 amplia. */
  zoom: number;
  /** Desplazamiento en px del lienzo, respecto al encaje centrado. */
  offsetX: number;
  offsetY: number;
}

/** Mosca circular: segunda imagen recortada en circulo, con aro de color. */
export interface Inset {
  image: CanvasImageSource;
  size: { width: number; height: number };
  cx: number;
  cy: number;
  radius: number;
}

export interface RenderOptions {
  photo: CanvasImageSource | null;
  photoSize: { width: number; height: number } | null;
  transform: PhotoTransform;
  overlay: CanvasImageSource;
  inset: Inset | null;
  text: string;
  colorBase: string;
  colorHighlight: string;
}

/** Grosor del aro para un radio dado. Se usa tambien al detectar el clic. */
export function ringWidth(radius: number): number {
  return Math.max(INSET_RING_MIN, radius * INSET_RING_RATIO);
}

/** Radio total de la mosca, aro incluido. */
export function insetOuterRadius(radius: number): number {
  return radius + ringWidth(radius);
}

/** True si el punto cae sobre la mosca, para saber que se esta arrastrando. */
export function hitsInset(inset: Inset, x: number, y: number): boolean {
  const dx = x - inset.cx;
  const dy = y - inset.cy;
  return Math.hypot(dx, dy) <= insetOuterRadius(inset.radius);
}

/**
 * Parte el texto en segmentos. `*asi*` marca el enfasis, igual que en el PSD
 * donde "impulsaran la Liga F" iba en amarillo dentro del titular blanco.
 */
export function parseSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), highlight: false });
    out.push({ text: m[1] ?? "", highlight: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), highlight: false });
  return out.filter((s) => s.text.length > 0);
}

/** Un "token" es una palabra o un espacio, con el color que le toca. */
interface Token {
  text: string;
  highlight: boolean;
  space: boolean;
}

function tokenize(segments: Segment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (part === "") continue;
      tokens.push({ text: part, highlight: seg.highlight, space: /^\s+$/.test(part) });
    }
  }
  return tokens;
}

type Line = Token[];

function layoutLines(ctx: CanvasRenderingContext2D, tokens: Token[], maxWidth: number): Line[] {
  const lines: Line[] = [];
  let line: Line = [];
  let width = 0;

  for (const token of tokens) {
    const w = ctx.measureText(token.text).width;
    // Un salto de linea explicito manda sobre el ajuste automatico.
    if (token.space && token.text.includes("\n")) {
      lines.push(line);
      line = [];
      width = 0;
      continue;
    }
    if (!token.space && width + w > maxWidth && line.length > 0) {
      // Cerrar linea quitando el espacio final, que no pinta nada.
      while (line.length > 0 && line[line.length - 1]!.space) line.pop();
      lines.push(line);
      line = [token];
      width = w;
      continue;
    }
    if (token.space && line.length === 0) continue; // no abrir linea con espacio
    line.push(token);
    width += w;
  }
  while (line.length > 0 && line[line.length - 1]!.space) line.pop();
  if (line.length > 0) lines.push(line);
  return lines.filter((l) => l.length > 0);
}

function setFont(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `${FONT_WEIGHT} ${size}px "${FONT_FAMILY}", system-ui, sans-serif`;
}

function lineWidth(ctx: CanvasRenderingContext2D, line: Line): number {
  let w = 0;
  for (const t of line) w += ctx.measureText(t.text).width;
  return w;
}

/**
 * Busca el cuerpo mas grande (hasta el del PSD) con el que el titular cabe
 * en la banda sin comerse el filete ni salirse por abajo.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
): { size: number; lines: Line[] } {
  for (let size = FONT_SIZE; size >= 28; size -= 1) {
    setFont(ctx, size);
    const lines = layoutLines(ctx, tokens, TEXT_MAX_W);
    if (lines.length === 0) return { size, lines };
    const lh = size * LINE_RATIO;
    const first = BASELINE_CENTER - ((lines.length - 1) * lh) / 2;
    const last = first + (lines.length - 1) * lh;
    const top = first - size * 0.75;
    const bottom = last + size * 0.25;
    // Ademas del alto, ninguna linea suelta puede desbordar el ancho.
    const fits =
      top >= TEXT_SAFE_TOP &&
      bottom <= TEXT_SAFE_BOTTOM &&
      lines.every((l) => lineWidth(ctx, l) <= TEXT_MAX_W + 1);
    if (fits) return { size, lines };
  }
  setFont(ctx, 28);
  return { size: 28, lines: layoutLines(ctx, tokens, TEXT_MAX_W) };
}

/** Encaje "cover" de la foto en el area 1080x972, mas zoom y desplazamiento. */
export function photoRect(
  photoSize: { width: number; height: number },
  transform: PhotoTransform,
): { x: number; y: number; w: number; h: number } {
  const scale =
    Math.max(CANVAS_W / photoSize.width, PHOTO_H / photoSize.height) * transform.zoom;
  const w = photoSize.width * scale;
  const h = photoSize.height * scale;
  return {
    x: (CANVAS_W - w) / 2 + transform.offsetX,
    y: (PHOTO_H - h) / 2 + transform.offsetY,
    w,
    h,
  };
}

function drawInset(
  ctx: CanvasRenderingContext2D,
  inset: Inset,
  ringColor: string,
): void {
  const ring = ringWidth(inset.radius);
  ctx.save();
  // Recortar a la zona de foto: la mosca no debe pisar la banda del titular.
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_W, PHOTO_H);
  ctx.clip();

  ctx.save();
  ctx.beginPath();
  ctx.arc(inset.cx, inset.cy, inset.radius, 0, Math.PI * 2);
  ctx.clip();
  const d = inset.radius * 2;
  const scale = Math.max(d / inset.size.width, d / inset.size.height);
  const w = inset.size.width * scale;
  const h = inset.size.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(inset.image, inset.cx - w / 2, inset.cy - h / 2, w, h);
  ctx.restore();

  // El aro va por fuera de la imagen, no la recorta.
  ctx.beginPath();
  ctx.arc(inset.cx, inset.cy, inset.radius + ring / 2, 0, Math.PI * 2);
  ctx.lineWidth = ring;
  ctx.strokeStyle = ringColor;
  ctx.stroke();
  ctx.restore();
}

/** Pinta la noticia completa en el contexto dado, a tamaño 1080x1350. */
export function render(ctx: CanvasRenderingContext2D, opts: RenderOptions): void {
  ctx.save();
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (opts.photo && opts.photoSize) {
    const r = photoRect(opts.photoSize, opts.transform);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, PHOTO_H);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(opts.photo, r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  if (opts.inset) drawInset(ctx, opts.inset, opts.colorHighlight);

  ctx.drawImage(opts.overlay, 0, OVERLAY_Y, CANVAS_W, CANVAS_H - OVERLAY_Y);

  const tokens = tokenize(parseSegments(opts.text));
  if (tokens.length > 0) {
    const { size, lines } = fitText(ctx, tokens);
    setFont(ctx, size);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const lh = size * LINE_RATIO;
    const first = BASELINE_CENTER - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      let x = (CANVAS_W - lineWidth(ctx, line)) / 2;
      const y = first + i * lh;
      for (const token of line) {
        ctx.fillStyle = token.highlight ? opts.colorHighlight : opts.colorBase;
        ctx.fillText(token.text, x, y);
        x += ctx.measureText(token.text).width;
      }
    });
  }
  ctx.restore();
}
