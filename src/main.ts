import overlayUrl from "./assets/overlay.png";
import {
  CANVAS_H,
  CANVAS_W,
  COLOR_BASE,
  COLOR_HIGHLIGHT,
  FONT_FAMILY,
  FONT_WEIGHT,
  INSET_DEFAULT_CX,
  INSET_DEFAULT_CY,
  INSET_DEFAULT_R,
  INSET_MAX_R,
  INSET_MIN_R,
  PHOTO_H,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./format.js";
import {
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
const resetColorsEl = need<HTMLButtonElement>("reset-colors");
const generateEl = need<HTMLButtonElement>("generate");
const statusEl = need<HTMLParagraphElement>("status");
const dropInsetEl = need<HTMLDivElement>("drop-inset");
const fileInsetEl = need<HTMLInputElement>("file-inset");
const pickInsetEl = need<HTMLButtonElement>("pick-inset");
const fileInsetNameEl = need<HTMLParagraphElement>("file-inset-name");
const insetControlsEl = need<HTMLDivElement>("inset-controls");
const insetSizeEl = need<HTMLInputElement>("inset-size");
const insetRemoveEl = need<HTMLButtonElement>("inset-remove");
const previewEl = need<HTMLCanvasElement>("preview");
const outputEl = need<HTMLElement>("output");
const resultEl = need<HTMLCanvasElement>("result");
const resultInfoEl = need<HTMLParagraphElement>("result-info");
const downloadEl = need<HTMLButtonElement>("download");

const previewCtx = previewEl.getContext("2d");
const resultCtx = resultEl.getContext("2d", { willReadFrequently: false });
if (!previewCtx || !resultCtx) throw new Error("Este navegador no soporta canvas 2D");

let photo: HTMLImageElement | null = null;
let photoSize: { width: number; height: number } | null = null;
let overlay: HTMLImageElement | null = null;
const transform: PhotoTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
let inset: Inset | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

function draw(): void {
  if (!overlay) return;
  render(previewCtx!, {
    photo,
    photoSize,
    transform,
    overlay,
    inset,
    text: textEl.value,
    colorBase: baseEl.value,
    colorHighlight: highEl.value,
  });
}

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
let pinch: { dist: number; zoom: number; radius: number } | null = null;

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
      inset.radius = clamp(pinch.radius * ratio, INSET_MIN_R, INSET_MAX_R);
      insetSizeEl.value = String(Math.round(inset.radius));
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

/** Rueda del raton: hace zoom de lo que haya bajo el cursor. */
previewEl.addEventListener(
  "wheel",
  (e) => {
    const target = targetAt(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    // deltaMode: 0 = px, 1 = lineas (Firefox), 2 = paginas.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    // Exponencial, para que el paso se note igual en cualquier escala.
    const factor = Math.exp((-e.deltaY * unit) / 600);
    if (target === "inset" && inset) {
      inset.radius = clamp(inset.radius * factor, INSET_MIN_R, INSET_MAX_R);
      insetSizeEl.value = String(Math.round(inset.radius));
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
    };
    insetSizeEl.value = String(inset.radius);
    insetControlsEl.hidden = false;
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
  draw();
});

insetRemoveEl.addEventListener("click", () => {
  inset = null;
  insetControlsEl.hidden = true;
  fileInsetEl.value = "";
  fileInsetNameEl.textContent = "Sin mosca";
  previewEl.classList.remove("over-inset");
  draw();
});

/* ---------- texto y colores ---------- */

textEl.addEventListener("input", draw);
baseEl.addEventListener("input", draw);
highEl.addEventListener("input", draw);
resetColorsEl.addEventListener("click", () => {
  baseEl.value = COLOR_BASE;
  highEl.value = COLOR_HIGHLIGHT;
  draw();
});

/* ---------- generar y descargar ---------- */

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

generateEl.addEventListener("click", () => {
  if (!overlay) return;
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
    inset,
    text: textEl.value,
    colorBase: baseEl.value,
    colorHighlight: highEl.value,
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
  overlay = await loadImage(overlayUrl);
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
