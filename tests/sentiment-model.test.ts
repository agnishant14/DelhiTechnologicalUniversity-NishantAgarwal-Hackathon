import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureSentimentModel } from "../server/sentiment-model";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "gorisk-model-"));
  directories.push(root);
  const assets = path.join(root, "assets"),
    cache = path.join(root, "cache");
  await mkdir(assets);
  for (const name of [
    "config.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
  ])
    await writeFile(path.join(assets, name), "{}");
  await writeFile(path.join(assets, "tokenizer.json.gz"), gzipSync("{}"));
  const bytes = "verified model bytes";
  const artifact = {
    version: "test",
    dtype: "q8" as const,
    maxLength: 128,
    url: "https://example.com/model.onnx",
    bytes: Buffer.byteLength(bytes),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const fetcher = vi.fn<typeof fetch>(async () => new Response(bytes));
  return { assets, cache, bytes, artifact, fetcher };
}

describe("trained sentiment model cache", () => {
  it.each(["q8", "fp16"] as const)(
    "downloads verified %s weights once and works from cache offline",
    async (dtype) => {
      const { artifact, cache, assets, fetcher, bytes } = await fixture();
      const selected = { ...artifact, dtype };
      const filename =
        dtype === "fp16" ? "model_fp16.onnx" : "model_quantized.onnx";
      await ensureSentimentModel(selected, cache, assets, fetcher);
      expect(await readFile(path.join(cache, "onnx", filename), "utf8")).toBe(
        bytes,
      );
      fetcher.mockRejectedValue(new Error("offline"));
      await expect(
        ensureSentimentModel(selected, cache, assets, fetcher),
      ).resolves.toBe(cache);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await readFile(path.join(cache, "config.json"), "utf8")).toBe(
        "{}",
      );
    },
  );

  it("repairs same-size cache corruption instead of accepting it", async () => {
    const { artifact, cache, assets, fetcher, bytes } = await fixture();
    await ensureSentimentModel(artifact, cache, assets, fetcher);
    await writeFile(
      path.join(cache, "onnx/model_quantized.onnx"),
      "x".repeat(bytes.length),
    );
    await ensureSentimentModel(artifact, cache, assets, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      await readFile(path.join(cache, "onnx/model_quantized.onnx"), "utf8"),
    ).toBe(bytes);
  });

  it.each(["short", "x".repeat(20), "x".repeat(100)])(
    "rejects invalid weights and removes partial files: %s",
    async (body) => {
      const { artifact, cache, assets, fetcher } = await fixture();
      fetcher.mockResolvedValue(new Response(body));
      await expect(
        ensureSentimentModel(artifact, cache, assets, fetcher),
      ).rejects.toThrow(/checksum|size/);
      expect(await readdir(path.join(cache, "onnx"))).toEqual([]);
    },
  );
});
