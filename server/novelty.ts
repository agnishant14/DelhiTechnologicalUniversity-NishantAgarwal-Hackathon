import type { Signal } from "../shared/types";

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s[-–|]\s[^-–|]{1,80}$/, "")
      .match(/\b[a-z0-9]{3,}\b/g) ?? [],
  );
const numbers = (text: string) =>
  (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");
export function annotateNovelty(signal: Signal, previous: Signal[]): Signal {
  const tokens = words(signal.text);
  const match = previous.find((old) => {
    if (
      old.event !== signal.event ||
      old.sentimentLabel !== signal.sentimentLabel
    )
      return false;
    if (
      old.mode !== signal.mode ||
      Math.abs(Date.parse(old.publishedAt) - Date.parse(signal.publishedAt)) >
        6 * 3600000
    )
      return false;
    if (
      old.tickers.join(",") !== signal.tickers.join(",") ||
      numbers(old.text) !== numbers(signal.text)
    )
      return false;
    const other = words(old.text);
    const common = [...tokens].filter((w) => other.has(w)).length;
    return (
      tokens.size >= 6 && common / new Set([...tokens, ...other]).size >= 0.78
    );
  });
  return {
    ...signal,
    clusterId: match?.clusterId ?? match?.id ?? signal.id,
    ...(match ? { duplicateOf: match.duplicateOf ?? match.id } : {}),
    evidence: [
      ...signal.evidence,
      match
        ? "Similar coverage within six hours: retained as evidence, excluded from another portfolio action."
        : "First observed coverage in this story cluster.",
    ],
  };
}
