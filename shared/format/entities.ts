const ONE_PASS = (input: string): string =>
  input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");

export const decodeEntities = (input: string): string => {
  if (!input.includes("&")) return input;
  let out = input;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = ONE_PASS(out);
    if (next === out) return out;
    out = next;
  }
  return out;
};
