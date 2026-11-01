
const LIGATURES: [RegExp, string][] = [
  [/œ/g, "oe"],
  [/æ/g, "ae"],
  [/ß/g, "ss"],
  [/ø/g, "o"],
];

export const searchKey = (text: string): string => {
  let out = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [pattern, replacement] of LIGATURES) out = out.replace(pattern, replacement);
  return out
    .replace(/[^a-z0-9֐-׿]+/g, " ")
    .replace(/([a-z])\1+/g, "$1")
    .trim();
};

export const queryWords = (query: string): string[] => {
  return searchKey(query).split(" ").filter(Boolean);
};

export const searchHaystack = (...fields: (string | undefined)[]): string => {
  return searchKey(fields.filter(Boolean).join(" "));
};

export const matchesWords = (words: string[], haystack: string): boolean => {
  return words.every((word) => haystack.includes(word));
};

export const matchesQuery = (query: string, ...fields: (string | undefined)[]): boolean => {
  const words = queryWords(query);
  if (words.length === 0) return true;
  return matchesWords(words, searchHaystack(...fields));
};
