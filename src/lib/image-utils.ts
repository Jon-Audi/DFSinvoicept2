/**
 * Utility functions for image handling
 */

/**
 * Convert an image URL to a base64 data URL
 * This is useful for printing images with react-to-print
 * Uses Image and Canvas to avoid CORS issues
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Could not get canvas context');
          resolve(url);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        resolve(url); // Fallback to original URL
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for base64 conversion');
      resolve(url); // Fallback to original URL
    };
    
    img.src = url;
  });
}
