import overlayUrl from "./assets/overlay.png";
import {
  CANVAS_H,
  CANVAS_W,
  COLOR_BASE,
  COLOR_HIGHLIGHT,
  FONT_FAMILY,
  FONT_WEIGHT,
} from "./format.js";
import { render, type PhotoTransform } from "./render.js";
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

let dragging = false;
let lastX = 0;
let lastY = 0;

previewEl.addEventListener("pointerdown", (e) => {
  if (!photo) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  previewEl.setPointerCapture(e.pointerId);
});
previewEl.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  // El canvas se muestra escalado: pasar el movimiento a px del lienzo.
  const scale = CANVAS_W / previewEl.getBoundingClientRect().width;
  transform.offsetX += (e.clientX - lastX) * scale;
  transform.offsetY += (e.clientY - lastY) * scale;
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});
for (const evt of ["pointerup", "pointercancel"] as const) {
  previewEl.addEventListener(evt, () => {
    dragging = false;
  });
}

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
