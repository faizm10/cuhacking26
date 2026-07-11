/**
 * Shrink canvas screenshots before sending to OpenAI vision.
 * Keeps the long edge ≤ maxEdge and re-encodes as JPEG to cut payload size.
 */

const DEFAULT_MAX_EDGE = 1024;
const DEFAULT_QUALITY = 0.72;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode canvas screenshot"));
    image.src = dataUrl;
  });
}

/**
 * Downscale a data-URL screenshot for faster vision requests.
 * Returns the original string if it is not a data URL or decoding fails.
 */
export async function compressScreenshotForVision(
  dataUrl: string | null | undefined,
  options?: { maxEdge?: number; quality?: number }
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return dataUrl ?? null;

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  try {
    const image = await loadImage(dataUrl);
    const longest = Math.max(image.width, image.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    // Already small JPEG — skip re-encode unless we need to shrink.
    if (
      scale === 1 &&
      dataUrl.startsWith("data:image/jpeg") &&
      dataUrl.length < 400_000
    ) {
      return dataUrl;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}
