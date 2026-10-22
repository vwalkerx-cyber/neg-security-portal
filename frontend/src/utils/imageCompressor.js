/**
 * Client-side Image Compression Utility
 * Prevents PostgREST egress bloat by resizing and compressing uploaded images
 * (avatars, ID screenshots, driving licenses, expungement letters)
 * before converting to Base64 and storing in PostgreSQL.
 */

export const compressImageFile = (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than max dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original read if canvas context fails
            return resolve(event.target.result);
          }

          // Fill white background for transparent PNGs converted to JPEG
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL(mimeType, quality);

          // If compression somehow produced larger output than original (rare), keep smaller
          if (compressedDataUrl && compressedDataUrl.length < event.target.result.length) {
            resolve(compressedDataUrl);
          } else {
            resolve(compressedDataUrl || event.target.result);
          }
        } catch {
          // Fallback to original base64 if canvas operation fails
          resolve(event.target.result);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};
