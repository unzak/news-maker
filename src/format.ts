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

/**
 * Limite inferior del logo, medido sobre la capa INFERIOR en el hueco entre
 * filetes (x 470..610), que es donde no hay filete que ensucie la medida.
 */
export const LOGO_BOTTOM = 978;

/**
 * Margenes verticales del texto. El de arriba sale del logo mas un respiro:
 * con 960 el titular de 5 lineas se montaba encima de la cara.
 */
export const TEXT_SAFE_TOP = LOGO_BOTTOM + 8;
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
/**
 * Grosor del aro respecto al radio, para que engorde con la mosca.
 * Con el radio por defecto (168) da 16.8 px de aro.
 */
export const INSET_RING_RATIO = 0.1;
export const INSET_RING_MIN = 5;

/** Limites del zoom de la foto de fondo. Mantener en sync con el input range. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

/**
 * Caja de la mascota de Cabronazi, tal cual venia dentro de la capa INFERIOR.
 * El overlay se guarda ya sin ella, y el logo se pinta encima aparte, para
 * poder cambiarlo por el de otra vertical.
 */
export const LOGO_X = 464;
export const LOGO_Y = 852;
export const LOGO_W = 151;
export const LOGO_H = 127;

/** Centro del hueco entre filetes: ahi va el logo, sea cual sea. */
export const LOGO_CX = LOGO_X + LOGO_W / 2;
export const LOGO_CY = LOGO_Y + LOGO_H / 2;

/**
 * Lado del distintivo circular de las demas verticales. Se iguala al alto de
 * la mascota para que ocupe lo mismo: asi no hay que tocar TEXT_SAFE_TOP y
 * quedan 12 px de aire hasta los filetes, igual que con Cabronazi.
 */
export const BADGE_SIZE = LOGO_H;

/** Las verticales, en el orden en que salen en el desplegable. */
export const VERTICALS = [
  { id: "cabronazi", label: "Cabronazi" },
  { id: "peludos", label: "Cabropeludos" },
  { id: "gamer", label: "Cabrogamer" },
  { id: "deportes", label: "Cabrodeportes" },
  { id: "motor", label: "Cabromotor" },
] as const;

export type VerticalId = (typeof VERTICALS)[number]["id"];

/**
 * Colores preestablecidos de los selectores. Blanco y amarillo son los del
 * titular en el PSD; los cinco restantes son el color dominante de cada logo,
 * medido sobre los PNG originales a 1080 px.
 */
export const SWATCHES = [
  { name: "Blanco", hex: COLOR_BASE },
  { name: "Amarillo", hex: COLOR_HIGHLIGHT },
  { name: "Rosa Cabronazi", hex: "#cc1c65" },
  { name: "Morado Cabropeludos", hex: "#890081" },
  { name: "Azul Cabrogamer", hex: "#003392" },
  { name: "Verde Cabrodeportes", hex: "#00ce5c" },
  { name: "Rojo Cabromotor", hex: "#ed282b" },
] as const;
