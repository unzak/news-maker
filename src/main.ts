import overlayUrl from "./assets/overlay.png";
import logoCabronazi from "./assets/logo-cabronazi.png";
import logoDeportes from "./assets/logo-deportes.png";
import logoGamer from "./assets/logo-gamer.png";
import logoMotor from "./assets/logo-motor.png";
import logoPeludos from "./assets/logo-peludos.png";
import ruleCoreUrl from "./assets/rule-core.png";
import ruleGlowUrl from "./assets/rule-glow.png";
import {
  CANVAS_H,
  CANVAS_W,
  FONT_FAMILY,
  FONT_WEIGHT,
  INSET_DEFAULT_CX,
  INSET_DEFAULT_CY,
  INSET_DEFAULT_R,
  INSET_MAX_R,
  INSET_MIN_R,
  BADGE_SIZE,
  PHOTO_H,
  SWATCHES,
  VERTICALS,
  type VerticalId,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./format.js";
import {
  clampInsetOffset,
  hitsInset,
  render,
  type Inset,
  type PhotoTransform,
} from "./render.js";
import "./style.css";

function need<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en el HTML`);
  return el as unknown as T;
}

const dropEl = need<HTMLDivElement>("drop");
const fileEl = need<HTMLInputElement>("file");
const pickEl = need<HTMLButtonElement>("pick");
const fileNameEl = need<HTMLParagraphElement>("file-name");
const zoomEl = need<HTMLInputElement>("zoom");
const textEl = need<HTMLTextAreaElement>("text");
const baseEl = need<HTMLInputElement>("color-base");
const highEl = need<HTMLInputElement>("color-highlight");
const ringEl = need<HTMLInputElement>("color-ring");
const verticalEl = need<HTMLSelectElement>("vertical");
const generateEl = need<HTMLButtonElement>("generate");
const statusEl = need<HTMLParagraphElement>("status");
const dropInsetEl = need<HTMLDivElement>("drop-inset");
const fileInsetEl = need<HTMLInputElement>("file-inset");
const pickInsetEl = need<HTMLButtonElement>("pick-inset");
const fileInsetNameEl = need<HTMLParagraphElement>("file-inset-name");
const insetControlsEl = need<HTMLDivElement>("inset-controls");
const insetSizeEl = need<HTMLInputElement>("inset-size");
const insetZoomEl = need<HTMLInputElement>("inset-zoom");
const insetRemoveEl = need<HTMLButtonElement>("inset-remove");
const ringColorFieldEl = need<HTMLDivElement>("ring-color-field");
const previewEl = need<HTMLCanvasElement>("preview");
const outputEl = need<HTMLElement>("output");
const resultEl = need<HTMLCanvasElement>("result");
const resultInfoEl = need<HTMLParagraphElement>("result-info");
const downloadEl = need<HTMLButtonElement>("download");
const previewPanelEl = need<HTMLElement>("preview-panel");
const miniEl = need<HTMLDivElement>("mini");
const miniCanvasEl = need<HTMLCanvasElement>("mini-canvas");
const miniCloseEl = need<HTMLButtonElement>("mini-close");

const previewCtx = previewEl.getContext("2d");
const resultCtx = resultEl.getContext("2d", { willReadFrequently: false });
const miniCtx = miniCanvasEl.getContext("2d");
if (!previewCtx || !resultCtx || !miniCtx) throw new Error("Este navegador no soporta canvas 2D");

let photo: HTMLImageElement | null = null;
let photoSize: { width: number; height: number } | null = null;
let overlay: HTMLImageElement | null = null;
let ruleGlow: HTMLImageElement | null = null;
let ruleCore: HTMLImageElement | null = null;
const transform: PhotoTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
let inset: Inset | null = null;

/**
 * Que se manipula al actuar sobre la mosca: la mosca misma o su contenido.
 * Manda sobre el arrastre, la rueda y el pellizco, para que dentro de un modo
 * todos los gestos afecten a lo mismo.
 */
let insetMode: "move" | "frame" = "move";

/**
 * Un archivo por vertical. Cabronazi es la mascota recortada de la capa
 * INFERIOR y va a su tamaño original; las demas son distintivos circulares
 * que se escalan a BADGE_SIZE.
 */
const LOGO_URLS: Record<VerticalId, string> = {
  cabronazi: logoCabronazi,
  peludos: logoPeludos,
  gamer: logoGamer,
  deportes: logoDeportes,
  motor: logoMotor,
};
const logos = new Map<VerticalId, HTMLImageElement>();

function currentVertical(): VerticalId {
  return verticalEl.value as VerticalId;
}

/** Color de marca de la vertical elegida, para el halo de los filetes. */
function currentColor(): string {
  const v = VERTICALS.find((x) => x.id === currentVertical());
  return v?.color ?? VERTICALS[0].color;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

function draw(): void {
  if (!overlay || !ruleGlow || !ruleCore) return;
  render(previewCtx!, {
    photo,
    photoSize,
    transform,
    overlay,
    ruleGlow,
    ruleCore,
    ruleColor: currentColor(),
    logo: logos.get(currentVertical()) ?? null,
    logoSize: currentVertical() === "cabronazi" ? null : BADGE_SIZE,
    inset,
    text: textEl.value,
    colorBase: baseEl.value,
    colorHighlight: highEl.value,
    colorRing: ringEl.value,
  });
  drawMini();
  updateMini();
}

/* ---------- vista previa flotante (movil) ---------- */

/** Una vez cerrada a mano, no vuelve a salir en toda la sesion. */
let miniDismissed = false;

/**
 * Cuanto antes de que asome el apartado de la previa se retira la miniatura.
 * Justo encima esta el boton GENERA, asi que este margen hace que se quite
 * cuando el boton empieza a entrar por abajo, en vez de taparlo.
 */
const MINI_HIDE_MARGIN = 120;

/** Copia la previa grande en la miniatura: mas barato que volver a componer. */
function drawMini(): void {
  miniCtx!.drawImage(previewEl, 0, 0, miniCanvasEl.width, miniCanvasEl.height);
}

/** True cuando el apartado de la previa esta a la vista, o a punto de estarlo. */
function previewIsNear(): boolean {
  const rect = previewPanelEl.getBoundingClientRect();
  return rect.top - MINI_HIDE_MARGIN < window.innerHeight && rect.bottom > 0;
}

function updateMini(): void {
  // Solo tiene sentido cuando ya hay algo que mirar.
  const show = !miniDismissed && photo !== null && !previewIsNear();
  miniEl.classList.toggle("is-visible", show);
  miniEl.setAttribute("aria-hidden", show ? "false" : "true");
}

for (const evt of ["scroll", "resize"] as const) {
  window.addEventListener(evt, updateMini, { passive: true });
}

miniCloseEl.addEventListener("click", () => {
  miniDismissed = true;
  updateMini();
});

// Tocar la miniatura lleva a la previa grande.
miniCanvasEl.addEventListener("click", () => {
  previewEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

function setStatus(msg: string, kind: "info" | "error" = "info"): void {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", kind === "error");
}

/* ---------- carga de la foto ---------- */

async function useFile(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    setStatus("Ese archivo no es una imagen.", "error");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    photo = img;
    photoSize = { width: img.naturalWidth, height: img.naturalHeight };
    transform.zoom = 1;
    transform.offsetX = 0;
    transform.offsetY = 0;
    zoomEl.value = "1";
    fileNameEl.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight}`;
    if (img.naturalWidth < CANVAS_W) {
      setStatus(
        `Aviso: la foto tiene ${img.naturalWidth} px de ancho y el formato pide ${CANVAS_W}. Se verá pixelada.`,
        "error",
      );
    } else {
      setStatus("Listo para generar.");
    }
    draw();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "No se pudo abrir la imagen.", "error");
  }
}

pickEl.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", () => {
  const file = fileEl.files?.[0];
  if (file) void useFile(file);
});

for (const evt of ["dragenter", "dragover"] as const) {
  dropEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropEl.classList.add("over");
  });
}
for (const evt of ["dragleave", "drop"] as const) {
  dropEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropEl.classList.remove("over");
  });
}
dropEl.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) void useFile(file);
});

/* ---------- reencuadre ---------- */

zoomEl.addEventListener("input", () => {
  transform.zoom = Number(zoomEl.value);
  draw();
});

type Target = "photo" | "inset";

/** Punteros activos sobre la vista previa, en coordenadas de pantalla. */
const pointers = new Map<number, { x: number; y: number }>();
let dragTarget: Target | null = null;
let lastX = 0;
let lastY = 0;

/** Estado del pellizco, mientras haya dos dedos apoyados. */
let pinch: { dist: number; zoom: number; radius: number; insetZoom: number } | null = null;

/** El canvas se muestra escalado: pasar coordenadas de pantalla a px del lienzo. */
function canvasScale(): number {
  return CANVAS_W / previewEl.getBoundingClientRect().width;
}

function toCanvas(x: number, y: number): { x: number; y: number } {
  const rect = previewEl.getBoundingClientRect();
  const s = canvasScale();
  return { x: (x - rect.left) * s, y: (y - rect.top) * s };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Que se manipula segun donde caiga un punto: la mosca o la foto de fondo. */
function targetAt(clientX: number, clientY: number): Target | null {
  const p = toCanvas(clientX, clientY);
  if (inset && hitsInset(inset, p.x, p.y)) return "inset";
  return photo ? "photo" : null;
}

/** Distancia y punto medio entre los dos primeros dedos. */
function pinchGeometry(): { dist: number; mx: number; my: number } | null {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return null;
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

function startPinch(): void {
  const g = pinchGeometry();
  if (!g) return;
  // El destino lo decide el punto medio: pellizcar sobre la mosca la escala a
  // ella, y en cualquier otro sitio hace zoom de la foto.
  dragTarget = targetAt(g.mx, g.my);
  if (!dragTarget) return;
  pinch = {
    dist: g.dist,
    zoom: transform.zoom,
    radius: inset?.radius ?? INSET_DEFAULT_R,
    insetZoom: inset?.zoom ?? 1,
  };
  lastX = g.mx;
  lastY = g.my;
}

previewEl.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2) {
    startPinch();
  } else {
    // Un solo dedo o raton: pinchar encima de la mosca la mueve a ella.
    dragTarget = targetAt(e.clientX, e.clientY);
    lastX = e.clientX;
    lastY = e.clientY;
  }

  // La captura mantiene el seguimiento aunque el dedo salga del lienzo.
  // Va la ultima y protegida: si fallara, el arrastre debe seguir vivo.
  try {
    previewEl.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura, pero el gesto sigue funcionando */
  }
});

previewEl.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (!dragTarget) {
    // Sin arrastrar, el cursor indica que hay algo agarrable debajo.
    const p = toCanvas(e.clientX, e.clientY);
    previewEl.classList.toggle(
      "over-inset",
      Boolean(inset && hitsInset(inset, p.x, p.y)),
    );
    return;
  }

  const s = canvasScale();

  if (pinch && pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g || pinch.dist === 0) return;
    const ratio = g.dist / pinch.dist;
    if (dragTarget === "inset" && inset) {
      if (insetMode === "frame") {
        inset.zoom = clamp(pinch.insetZoom * ratio, ZOOM_MIN, ZOOM_MAX);
        insetZoomEl.value = String(inset.zoom);
      } else {
        inset.radius = clamp(pinch.radius * ratio, INSET_MIN_R, INSET_MAX_R);
        insetSizeEl.value = String(Math.round(inset.radius));
      }
      clampInsetOffset(inset);
    } else {
      transform.zoom = clamp(pinch.zoom * ratio, ZOOM_MIN, ZOOM_MAX);
      zoomEl.value = String(transform.zoom);
    }
    // El punto medio tambien arrastra, que es lo que espera el dedo.
    move(dragTarget, (g.mx - lastX) * s, (g.my - lastY) * s);
    lastX = g.mx;
    lastY = g.my;
    draw();
    return;
  }

  move(dragTarget, (e.clientX - lastX) * s, (e.clientY - lastY) * s);
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});

/**
 * Suavidad de la rueda. Una muesca tipica manda deltaY 100, asi que con 2000
 * sale un ~5% por muesca: hacen falta unas 22 para recorrer todo el rango.
 * Cuanto mas alto, mas progresivo.
 */
const WHEEL_DIVISOR = 2000;
/** Tope por evento, para que un golpe fuerte de rueda no pegue un salto. */
const WHEEL_MAX_DELTA = 120;

/** Rueda del raton: hace zoom de lo que haya bajo el cursor. */
previewEl.addEventListener(
  "wheel",
  (e) => {
    const target = targetAt(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    // deltaMode: 0 = px, 1 = lineas (Firefox), 2 = paginas.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    const delta = clamp(e.deltaY * unit, -WHEEL_MAX_DELTA, WHEEL_MAX_DELTA);
    // Exponencial, para que el paso se note igual en cualquier escala.
    const factor = Math.exp(-delta / WHEEL_DIVISOR);
    if (target === "inset" && inset) {
      if (insetMode === "frame") {
        inset.zoom = clamp(inset.zoom * factor, ZOOM_MIN, ZOOM_MAX);
        insetZoomEl.value = String(inset.zoom);
      } else {
        inset.radius = clamp(inset.radius * factor, INSET_MIN_R, INSET_MAX_R);
        insetSizeEl.value = String(Math.round(inset.radius));
      }
      clampInsetOffset(inset);
    } else {
      transform.zoom = clamp(transform.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      zoomEl.value = String(transform.zoom);
    }
    draw();
  },
  // Hace falta para poder cortar el scroll de la pagina.
  { passive: false },
);

function move(target: Target, dx: number, dy: number): void {
  if (target === "inset" && inset) {
    if (insetMode === "frame") {
      inset.offsetX += dx;
      inset.offsetY += dy;
      clampInsetOffset(inset);
      return;
    }
    // Dejar siempre un trozo dentro del lienzo para poder recuperarla.
    inset.cx = clamp(inset.cx + dx, 0, CANVAS_W);
    inset.cy = clamp(inset.cy + dy, 0, PHOTO_H);
  } else {
    transform.offsetX += dx;
    transform.offsetY += dy;
  }
}

for (const evt of ["pointerup", "pointercancel"] as const) {
  previewEl.addEventListener(evt, (e) => {
    pointers.delete(e.pointerId);
    pinch = null;
    if (pointers.size === 1) {
      // Al levantar un dedo, seguir arrastrando con el que queda en vez de
      // dar un salto la proxima vez que se mueva.
      const [p] = [...pointers.values()];
      if (p) {
        lastX = p.x;
        lastY = p.y;
      }
    } else if (pointers.size === 0) {
      dragTarget = null;
    }
  });
}

/* ---------- mosca ---------- */

/** Los controles de la mosca y el color de su aro solo salen si hay imagen. */
function setInsetUI(visible: boolean): void {
  insetControlsEl.hidden = !visible;
  ringColorFieldEl.hidden = !visible;
}

async function useInsetFile(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    setStatus("Ese archivo no es una imagen.", "error");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    inset = {
      image: img,
      size: { width: img.naturalWidth, height: img.naturalHeight },
      // Si ya habia mosca, respetar donde la habia dejado el usuario.
      cx: inset?.cx ?? INSET_DEFAULT_CX,
      cy: inset?.cy ?? INSET_DEFAULT_CY,
      radius: inset?.radius ?? INSET_DEFAULT_R,
      // La imagen es nueva, asi que su encuadre vuelve al punto de partida.
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };
    insetSizeEl.value = String(inset.radius);
    insetZoomEl.value = "1";
    setInsetUI(true);
    fileInsetNameEl.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight}`;
    setStatus("Mosca añadida. Arrástrala en la vista previa para colocarla.");
    draw();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "No se pudo abrir la imagen.", "error");
  }
}

pickInsetEl.addEventListener("click", () => fileInsetEl.click());
fileInsetEl.addEventListener("change", () => {
  const file = fileInsetEl.files?.[0];
  if (file) void useInsetFile(file);
});

for (const evt of ["dragenter", "dragover"] as const) {
  dropInsetEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropInsetEl.classList.add("over");
  });
}
for (const evt of ["dragleave", "drop"] as const) {
  dropInsetEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropInsetEl.classList.remove("over");
  });
}
dropInsetEl.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) void useInsetFile(file);
});

insetSizeEl.addEventListener("input", () => {
  if (!inset) return;
  inset.radius = Number(insetSizeEl.value);
  clampInsetOffset(inset);
  draw();
});

insetZoomEl.addEventListener("input", () => {
  if (!inset) return;
  inset.zoom = Number(insetZoomEl.value);
  clampInsetOffset(inset);
  draw();
});

for (const b of document.querySelectorAll<HTMLButtonElement>(".mode")) {
  b.addEventListener("click", () => {
    insetMode = b.dataset.mode === "frame" ? "frame" : "move";
    for (const o of document.querySelectorAll(".mode")) {
      o.classList.toggle("is-active", o === b);
    }
    // El cursor de la previa cambia de significado con el modo.
    previewEl.classList.toggle("frame-mode", insetMode === "frame");
  });
}

insetRemoveEl.addEventListener("click", () => {
  inset = null;
  setInsetUI(false);
  fileInsetEl.value = "";
  fileInsetNameEl.textContent = "Sin mosca";
  insetZoomEl.value = "1";
  insetMode = "move";
  for (const o of document.querySelectorAll(".mode")) {
    o.classList.toggle("is-active", (o as HTMLElement).dataset.mode === "move");
  }
  previewEl.classList.remove("over-inset", "frame-mode");
  draw();
});

/* ---------- texto y colores ---------- */

textEl.addEventListener("input", draw);
for (const el of [baseEl, highEl, ringEl]) {
  el.addEventListener("input", () => {
    markSwatches();
    draw();
  });
}
verticalEl.addEventListener("change", draw);

/** Pinta los preestablecidos bajo cada selector y marca el que esta puesto. */
function buildSwatches(): void {
  for (const box of document.querySelectorAll<HTMLDivElement>(".swatches")) {
    const input = document.getElementById(box.dataset.target ?? "");
    if (!(input instanceof HTMLInputElement)) continue;
    for (const { name, hex } of SWATCHES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.style.background = hex;
      b.title = name;
      b.setAttribute("aria-label", name);
      b.dataset.hex = hex;
      b.addEventListener("click", () => {
        input.value = hex;
        // El evento es el que dispara el redibujado y el marcado.
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      box.append(b);
    }
  }
}

function markSwatches(): void {
  for (const box of document.querySelectorAll<HTMLDivElement>(".swatches")) {
    const input = document.getElementById(box.dataset.target ?? "");
    if (!(input instanceof HTMLInputElement)) continue;
    for (const b of box.querySelectorAll<HTMLButtonElement>(".swatch")) {
      b.classList.toggle("is-active", b.dataset.hex === input.value.toLowerCase());
    }
  }
}

/* ---------- generar y descargar ---------- */

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

generateEl.addEventListener("click", () => {
  if (!overlay || !ruleGlow || !ruleCore) return;
  if (!photo) {
    setStatus("Añade una imagen antes de generar.", "error");
    return;
  }
  if (textEl.value.trim() === "") {
    setStatus("Escribe el titular antes de generar.", "error");
    return;
  }
  render(resultCtx!, {
    photo,
    photoSize,
    transform,
    overlay,
    ruleGlow,
    ruleCore,
    ruleColor: currentColor(),
    logo: logos.get(currentVertical()) ?? null,
    logoSize: currentVertical() === "cabronazi" ? null : BADGE_SIZE,
    inset,
    text: textEl.value,
    colorBase: baseEl.value,
    colorHighlight: highEl.value,
    colorRing: ringEl.value,
  });
  outputEl.hidden = false;
  resultInfoEl.textContent = `PNG ${CANVAS_W} × ${CANVAS_H} px · sin pérdida`;
  setStatus("Imagen generada abajo.");
  outputEl.scrollIntoView({ behavior: "smooth", block: "start" });
});

downloadEl.addEventListener("click", () => {
  resultEl.toBlob((blob) => {
    if (!blob) {
      setStatus("No se pudo exportar el PNG.", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cabronazi-noticia-${stamp()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

/* ---------- arranque ---------- */

async function boot(): Promise<void> {
  buildSwatches();
  markSwatches();
  const [ov, glow, core, ...cargados] = await Promise.all([
    loadImage(overlayUrl),
    loadImage(ruleGlowUrl),
    loadImage(ruleCoreUrl),
    ...Object.entries(LOGO_URLS).map(async ([id, url]) => {
      logos.set(id as VerticalId, await loadImage(url));
    }),
  ]);
  overlay = ov as HTMLImageElement;
  ruleGlow = glow as HTMLImageElement;
  ruleCore = core as HTMLImageElement;
  void cargados;
  // Sin esperar a la fuente, el primer render saldria con la tipografia de respaldo.
  try {
    await document.fonts.load(`${FONT_WEIGHT} 64px "${FONT_FAMILY}"`);
    await document.fonts.ready;
  } catch {
    setStatus("No se pudo cargar Poppins; se usará una fuente de respaldo.", "error");
  }
  draw();
}

void boot();
