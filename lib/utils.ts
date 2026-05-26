/**
 * Client-side image compression before uploading to Firebase Storage.
 * Resizes images to max 1200px width and compresses to ~80% quality.
 * This reduces upload size from 5-10MB (raw phone photo) to ~200-400KB.
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => resolve(file); // fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format a number as Indonesian Rupiah string.
 */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/**
 * Calculate the number of days between now and a target date.
 * Returns negative if the date has passed.
 */
export function daysUntil(targetDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format a Firestore timestamp or Date to a readable Indonesian date string.
 */
export function formatDate(
  date: any,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date?.toDate?.() || new Date(date);
  return d.toLocaleDateString(
    "id-ID",
    options || {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}
