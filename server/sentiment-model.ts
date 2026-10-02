import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { gunzipSync } from "node:zlib";

export interface SentimentArtifact {
  version: string;
  maxLength: number;
  dtype: "fp16" | "q8";
  url: string;
  sha256: string;
  bytes: number;
}

async function verified(filename: string, artifact: SentimentArtifact) {
  try {
    if ((await stat(filename)).size !== artifact.bytes) return false;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    return hash.digest("hex") === artifact.sha256;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function ensureSentimentModel(
  artifact: SentimentArtifact,
  directory = path.resolve(".cache/sentiment", artifact.version),
  assets = path.resolve("models/sentiment"),
  fetcher: typeof fetch = fetch,
) {
  const onnx = path.join(
    directory,
    artifact.dtype === "fp16"
      ? "onnx/model_fp16.onnx"
      : "onnx/model_quantized.onnx",
  );
  await mkdir(path.dirname(onnx), { recursive: true });
  if (!(await verified(onnx, artifact))) {
    const temporary = `${onnx}.${randomUUID()}.tmp`;
    try {
      const response = await fetcher(artifact.url, {
        signal: AbortSignal.timeout(300_000),
      });
      if (!response.ok || !response.body)
        throw new Error(`Sentiment model download failed (${response.status})`);
      let size = 0;
      const hash = createHash("sha256");
      const verify = new Transform({
        transform(chunk, _encoding, callback) {
          size += chunk.length;
          if (size > artifact.bytes) {
            callback(new Error("Sentiment model exceeds expected size"));
            return;
          }
          hash.update(chunk);
          callback(null, chunk);
        },
      });
      await pipeline(
        Readable.fromWeb(response.body as ReadableStream),
        verify,
        createWriteStream(temporary, { flags: "wx" }),
      );
      if (size !== artifact.bytes || hash.digest("hex") !== artifact.sha256)
        throw new Error("Sentiment model checksum mismatch");
      await rename(temporary, onnx);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  for (const name of [
    "config.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
  ])
    await copyFile(path.join(assets, name), path.join(directory, name));
  await writeFile(
    path.join(directory, "tokenizer.json"),
    gunzipSync(await readFile(path.join(assets, "tokenizer.json.gz"))),
  );
  return directory;
}
