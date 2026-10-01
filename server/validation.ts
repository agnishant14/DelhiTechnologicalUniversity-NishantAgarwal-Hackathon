import { z } from "zod";

export const documentSchema = z.object({
  text: z.string().trim().min(10).max(6000),
  sourceKind: z.enum(["news", "social", "manual"]).default("manual"),
  sourceName: z.string().trim().min(1).max(100).default("Manual input"),
  sourceUrl: z
    .url()
    .refine((url) => ["http:", "https:"].includes(new URL(url).protocol))
    .optional(),
  publishedAt: z.iso
    .datetime()
    .refine(
      (value) => new Date(value).getTime() <= Date.now() + 300_000,
      "Publication time is in the future",
    )
    .default(() => new Date().toISOString()),
});
