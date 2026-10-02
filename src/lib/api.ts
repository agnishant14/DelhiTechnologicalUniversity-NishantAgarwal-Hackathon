export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
export const percent = (value: number, digits = 1) =>
  `${(value * 100).toFixed(digits)}%`;
export const money = (value: number) =>
  `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(2)}m`;
export const signed = (value: number, digits = 2) =>
  `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
export const tone = (value: number) =>
  value > 0.001 ? "positive" : value < -0.001 ? "negative" : "neutral";
export function ago(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000),
  );
  return minutes < 1
    ? "just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}

export const sentimentTone = (value: number) =>
  value > 0.15 ? "positive" : value < -0.15 ? "negative" : "neutral";
