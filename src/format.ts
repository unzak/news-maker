/**
 * Constantes extraidas directamente de "NOTICIAS FRASE.psd".
 * No tocar a ojo: si cambia la plantilla, volver a medir sobre el PSD.
 */

/** Lienzo del PSD: 1080x1350 (4:5), RGB 8 bits, 300 dpi. */
export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

/** Area que ocupa la capa FOTO. Por debajo ya manda la banda negra. */
export const PHOTO_H = 972;

/** La capa INFERIOR (degradado + logo + filetes) se pega en y=670. */
export const OVERLAY_Y = 670;
export const OVERLAY_H = CANVAS_H - OVERLAY_Y;

/** Capa TEXTO: Poppins-Bold, FontSize 54.72179 x escala 1.1803 del layer. */
export const FONT_FAMILY = "Poppins";
export const FONT_WEIGHT = 700;
export const FONT_SIZE = 64.59;

/**
 * El StyleSheet trae /Leading 79.16666, pero con /AutoLeading true Photoshop
 * lo ignora y usa el 1.2 del ParagraphSheet. Medido sobre el composite: las
 * baselines caen cada 77.4 px, que es 1.2 x 64.59. No usar el valor /Leading.
 */
export const LINE_RATIO = 1.2;
export const LINE_HEIGHT = FONT_SIZE * LINE_RATIO;

/**
 * Ancho de composicion del parrafo, del descriptor de tipo:
 * bounds Rght 882.2015 pt x escala 1.1803 = 1041.3 px.
 * Ojo: la capa mide 1005 px de ancho porque eso es la tinta
 * (boundingBox = 1002.9 px), no la caja. Cortar en 1005 parte
 * "con cuatro partidos en abierto" (1006.4 px) antes de tiempo.
 */
export const TEXT_MAX_W = 1041.3;

/**
 * Baseline de la linea central. En el PSD las 3 lineas caen en
 * 1071.9 / 1149.4 / 1226.9, asi que el bloque se centra en la de enmedio.
 * Con esto 2, 3 o 4 lineas quedan siempre equilibradas en la banda.
 */
export const BASELINE_CENTER = 1149.44;

/** Margenes verticales donde el texto no debe invadir el filete ni el borde. */
export const TEXT_SAFE_TOP = 960;
export const TEXT_SAFE_BOTTOM = 1300;

/** Colores del PSD: blanco base y amarillo de enfasis. */
export const COLOR_BASE = "#ffffff";
export const COLOR_HIGHLIGHT = "#ffde00";

/** Fondo bajo la foto (capa FONDO). */
export const COLOR_BG = "#000000";

/**
 * Mosca circular opcional. Los valores por defecto salen de medir la
 * proporcion en una publicacion ya montada: centro al 77% del ancho y al
 * 47% del alto, y un diametro de ~31% del ancho.
 */
export const INSET_DEFAULT_CX = 828;
export const INSET_DEFAULT_CY = 630;
export const INSET_DEFAULT_R = 168;
export const INSET_MIN_R = 90;
export const INSET_MAX_R = 280;
/** Grosor del aro respecto al radio, para que engorde con la mosca. */
export const INSET_RING_RATIO = 0.12;
export const INSET_RING_MIN = 6;

/** Limites del zoom de la foto de fondo. Mantener en sync con el input range. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
