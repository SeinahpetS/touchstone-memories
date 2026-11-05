import { supabase } from "@/integrations/supabase/client";

export const PHOTO_MAX_SIDE = 2048;
export function resizedPhotoDimensions(width: number, height: number) {
  const ratio = Math.min(1, PHOTO_MAX_SIDE / Math.max(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function resizeOnboardingPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const dimensions = resizedPhotoDimensions(image.naturalWidth, image.naturalHeight);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This device could not prepare your photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not prepare photo.")), "image/jpeg", 0.9));
  } finally { URL.revokeObjectURL(url); }
}

function openPhotos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("touchstone-onboarding-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function photoTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openPhotos();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("photos", mode);
    const request = operation(transaction.objectStore("photos"));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error ?? request.error); };
  });
}

export const storeOnboardingPhoto = (key: string, blob: Blob) => photoTransaction("readwrite", store => store.put(blob, key));
export const readOnboardingPhoto = (key: string): Promise<Blob | undefined> => photoTransaction("readonly", store => store.get(key));
export const removeOnboardingPhoto = (key: string) => photoTransaction("readwrite", store => store.delete(key));

export async function uploadOnboardingPhoto(userId: string, memoryId: string, key: string): Promise<string> {
  const photo = await readOnboardingPhoto(key);
  if (!photo) throw new Error("Your saved photo could not be found on this device.");
  const path = `${userId}/${memoryId}.jpg`;
  const { error } = await supabase.storage.from("memory-photos").upload(path, photo, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}