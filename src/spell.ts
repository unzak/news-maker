/**
 * Revision ortografica y gramatical con LanguageTool.
 *
 * Se llama una sola vez, al generar, y nunca por su cuenta: su API publica pide
 * expresamente que no se le manden peticiones automaticas, y una pulsacion del
 * usuario no lo es. Ademas obliga a un enlace visible a languagetool.org, que
 * esta en el HTML junto al aviso.
 *
 * El dia que haya un LanguageTool propio levantado, esto vale igual cambiando
 * `ENDPOINT`: ahi se caen los terminos, el enlace y los limites.
 */

const ENDPOINT = "https://api.languagetool.org/v2/check";

/** Corta la espera: si tarda mas, se genera igual y sin revisar. */
const TIMEOUT_MS = 8000;

/** Mas de tres sugerencias no caben en una linea y no ayudan a decidir. */
const MAX_REPLACEMENTS = 3;

/**
 * Categorias que no se avisan. `CASING` son las reglas de mayusculas, y aqui
 * estorban: un rotulo empieza en minuscula o va entero en caja alta cuando al
 * meme le conviene, no cuando lo dice la norma.
 *
 * Ojo, esto no toca las tildes: un texto en mayusculas sigue avisando de que
 * "ESTA" del verbo estar lleva tilde, y la sugerencia llega tambien en
 * mayusculas.
 */
const IGNORED_CATEGORIES = new Set(["CASING"]);

export interface Issue {
  /** El trozo del rotulo que se marca. */
  text: string;
  message: string;
  replacements: string[];
  /**
   * Posiciones en el texto ORIGINAL, con sus asteriscos. LanguageTool las da
   * sobre el texto ya limpio, asi que se traducen al volver: si se corrigiera
   * sobre el limpio, aplicar el arreglo se llevaria por delante el resaltado.
   */
  start: number;
  end: number;
}

interface RawMatch {
  offset: number;
  length: number;
  message: string;
  replacements?: { value: string }[];
  rule?: { id: string; category?: { id?: string } };
}

interface Plain {
  text: string;
  /** Para cada posicion del texto limpio, la que le toca en el original. */
  map: number[];
}

/**
 * Quita los asteriscos del resaltado antes de mandar el texto: son marca
 * nuestra, no del idioma, y pegados a la palabra la convierten en otra cosa.
 * Se guarda de donde salio cada caracter para poder volver.
 */
function plain(text: string): Plain {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "*") continue;
    map.push(i);
    out += text[i];
  }
  return { text: out, map };
}

/**
 * Devuelve la sugerencia con la caja de la palabra que sustituye.
 *
 * Hace falta porque en inicio de frase LanguageTool capitaliza la sugerencia
 * aunque lo escrito vaya en minuscula: "ortografia" devuelve "Ortografía". Sin
 * esto, corregir una errata de la primera palabra te cambia ademas la caja, que
 * es justo lo que no queremos. Filtrar `CASING` no cubre este caso, porque el
 * aviso viene de la regla de erratas, no de la de mayusculas.
 */
function matchCase(original: string, replacement: string): string {
  const first = replacement[0];
  const head = original[0];
  if (first === undefined || head === undefined) return replacement;

  // Sin distincion de caja (cifras, signos) no hay nada que imitar.
  const hasCase = original.toUpperCase() !== original.toLowerCase();
  if (!hasCase) return replacement;

  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (head === head.toLowerCase()) return first.toLowerCase() + replacement.slice(1);
  return first.toUpperCase() + replacement.slice(1);
}

/**
 * Devuelve lo que LanguageTool encuentra. Lanza si no se puede consultar, para
 * que quien llama decida — aqui la revision nunca debe estorbar al generado.
 */
export async function check(text: string): Promise<Issue[]> {
  const { text: clean, map } = plain(text);
  if (clean.trim().length === 0) return [];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text: clean, language: "es" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`LanguageTool respondió ${res.status}`);

  const data = (await res.json()) as { matches?: RawMatch[] };
  const issues: Issue[] = [];
  for (const m of data.matches ?? []) {
    if (IGNORED_CATEGORIES.has(m.rule?.category?.id ?? "")) continue;
    const start = map[m.offset];
    const end = map[m.offset + m.length - 1];
    // Un aviso sin sitio en el original no se puede ni mostrar ni arreglar.
    if (start === undefined || end === undefined) continue;
    const marked = clean.slice(m.offset, m.offset + m.length);
    issues.push({
      text: marked,
      message: m.message,
      replacements: (m.replacements ?? [])
        .slice(0, MAX_REPLACEMENTS)
        .map((r) => matchCase(marked, r.value)),
      start,
      end: end + 1,
    });
  }
  return issues;
}

/**
 * El texto con la primera sugerencia de cada aviso aplicada. Se va de atras
 * hacia delante para que cada cambio no descoloque las posiciones de los que
 * quedan, y se saltan los avisos que pisen a uno ya aplicado.
 */
export function applyFixes(text: string, issues: Issue[]): string {
  let out = text;
  let limit = text.length;
  const ordered = issues
    .filter((i) => i.replacements.length > 0)
    .sort((a, b) => b.start - a.start);

  for (const issue of ordered) {
    if (issue.end > limit) continue;
    out = out.slice(0, issue.start) + issue.replacements[0] + out.slice(issue.end);
    limit = issue.start;
  }
  return out;
}
