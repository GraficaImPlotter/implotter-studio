/**
 * Optimizes image URLs for performance by adding format and size parameters.
 * Supports Unsplash and Supabase Storage URLs.
 */
export const getOptimizedUrl = (url: string, { width, quality = 80, format = 'webp' }: { width?: number, quality?: number, format?: string } = {}) => {
  if (!url) return "/placeholder.svg";

  // Unsplash optimization
  if (url.includes("images.unsplash.com")) {
    const baseUrl = url.split("?")[0];
    const params = new URLSearchParams();
    if (width) params.set("w", String(width));
    params.set("q", String(quality));
    params.set("fm", format);
    params.set("auto", "format,compress");
    return `${baseUrl}?${params.toString()}`;
  }

  // Supabase optimization (if using Supabase Image Transformation)
  // Requires Pro/Pay-as-you-go plan, but we can structure the URL just in case
  if (url.includes(".supabase.co/storage/v1/object/public/")) {
    if (!width) return url;
    // Format: .../object/public/bucket/file.jpg -> .../render/image/public/bucket/file.jpg?width=...
    const [baseUrl, path] = url.split("/storage/v1/object/public/");
    return `${baseUrl}/storage/v1/render/image/public/${path}?width=${width}&quality=${quality}&format=${format}`;
  }

  return url;
};
