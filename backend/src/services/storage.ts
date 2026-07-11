import { randomUUID } from "node:crypto";

import { Storage } from "@google-cloud/storage";

import { env } from "../config/env.js";

/**
 * Google Cloud Storage uploads for canvas screenshots.
 *
 * Optional like Firestore: without GCS_BUCKET the upload is skipped and the
 * API responds with screenshotUrl: null.
 */

let storage: Storage | null | undefined;

function getBucket() {
  if (storage === undefined) {
    storage = env.GCS_BUCKET ? new Storage() : null;
  }
  return storage && env.GCS_BUCKET ? storage.bucket(env.GCS_BUCKET) : null;
}

export function isStorageEnabled(): boolean {
  return getBucket() !== null;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Upload a base64 data URL screenshot. Returns the object's public URL, or
 * null when storage is disabled.
 */
export async function uploadScreenshot(
  dataUrl: string,
  projectId: string | null
): Promise<string | null> {
  const bucket = getBucket();
  if (!bucket) return null;

  const [header, data] = dataUrl.split(",", 2);
  const mimeType = header?.slice("data:".length).replace(";base64", "") ?? "";
  const extension = EXTENSIONS[mimeType];
  if (!extension || !data) {
    throw new Error(`Unsupported screenshot mime type: ${mimeType}`);
  }

  const objectPath = `screenshots/${projectId ?? "anonymous"}/${Date.now()}-${randomUUID()}.${extension}`;
  await bucket.file(objectPath).save(Buffer.from(data, "base64"), {
    contentType: mimeType,
    resumable: false,
  });

  return `https://storage.googleapis.com/${env.GCS_BUCKET}/${objectPath}`;
}
