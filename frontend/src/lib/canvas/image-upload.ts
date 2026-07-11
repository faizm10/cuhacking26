const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/** Keep under the generate-game payload cap after base64 encoding. */
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export const ACCEPT_IMAGE_ATTR = "image/png,image/jpeg,image/webp,image/gif";

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  // Some OS/browsers omit MIME — fall back to extension.
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export function filterImageFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(isAcceptedImageFile);
}

export function validateImageFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Use a PNG, JPEG, WebP, or GIF image.";
  }
  const tooBig = files.find((file) => file.size > MAX_UPLOAD_BYTES);
  if (tooBig) {
    return `"${tooBig.name}" is too large — keep uploads under 6MB.`;
  }
  return null;
}
