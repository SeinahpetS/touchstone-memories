export type CropArea = { x: number; y: number; width: number; height: number };

/** Draws the chosen pixel area of an image into a new JPEG blob. */
export async function cropPhotoBlob(src: string, area: CropArea): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width); canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.9));
}
