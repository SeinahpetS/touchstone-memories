/**
 * Every photo upload passes through here. HEIC/HEIF becomes JPEG, then the
 * image is redrawn on a canvas and re-encoded, so the uploaded file carries no
 * EXIF, GPS, XMP or camera data. Read GPS from the ORIGINAL file (readPhotoGps)
 * before calling this — the cleaned copy has none.
 */
const HEIC_RE = /\.(heic|heif)$/i;

export function isHeic(file: Blob & { name?: string }): boolean {
  return /image\/hei[cf]/i.test(file.type) || HEIC_RE.test(file.name ?? "");
}

async function toJpegFromHeic(file: Blob): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(out) ? out[0] : out;
}

async function decode(blob: Blob): Promise<{ draw: CanvasImageSource; w: number; h: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { draw: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return { draw: img, w: img.naturalWidth, h: img.naturalHeight };
}

/** Returns a metadata-free JPEG File (named *.jpg) ready to upload. */
export async function sanitizePhoto(file: Blob & { name?: string }, maxEdge = 4096): Promise<File> {
  const source = isHeic(file) ? await toJpegFromHeic(file) : file;
  const img = await decode(source);
  const scale = Math.min(1, maxEdge / Math.max(img.w, img.h));
  const w = Math.round(img.w * scale), h = Math.round(img.h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare that photo.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs flatten onto white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img.draw, 0, 0, w, h);
  img.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  if (!blob) throw new Error("Couldn't prepare that photo.");
  const base = (file.name ?? "photo").replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
