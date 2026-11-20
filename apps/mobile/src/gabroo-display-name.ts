/** Normalize the optional name used by Gabroo without changing its language or script. */
export function normalizeGabrooDisplayName(value: string): string {
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  return [...normalized].slice(0, 80).join("");
}
