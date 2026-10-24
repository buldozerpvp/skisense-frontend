/**
 * Matching what people actually type.
 *
 * Nobody types the diacritics, nobody matches the operator's capitalisation,
 * and nobody remembers whether the hotel is "Pas" or "Pass" — so a search box
 * that compares raw strings finds nothing and looks broken. Both sides are
 * reduced to the same skeleton before they meet.
 */

/** Ligatures NFD leaves alone, spelled out so "Cœur" meets "coeur". */
const LIGATURES: [RegExp, string][] = [
  [/œ/g, "oe"],
  [/æ/g, "ae"],
  [/ß/g, "ss"],
  [/ø/g, "o"],
];

/**
 * The comparison form of a piece of text.
 *
 * Accents go (màgic -> magic), case goes, punctuation becomes a space so
 * "l'eclose" and "l eclose" agree, and a doubled letter collapses to one so
 * "pass" reaches "Pas" and "hotell" reaches "Hotel".
 */
export function searchKey(text: string): string {
  let out = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [pattern, replacement] of LIGATURES) out = out.replace(pattern, replacement);
  return out
    .replace(/[^a-z0-9֐-׿]+/g, " ")
    .replace(/([a-z])\1+/g, "$1")
    .trim();
}

/**
 * Does this row answer the query?
 *
 * Every word typed has to appear somewhere in the row, but order doesn't
 * matter and neither does which field each word came from: "magic pass"
 * finds "Hotel Magic Pas", and so does "pas andorra", where one word is the
 * hotel and the other the country.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const words = searchKey(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchKey(fields.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}
