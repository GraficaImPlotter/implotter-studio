export const getOptimizedUrl = (url: string | null | undefined, options: { width?: number, quality?: number, format?: string } = {}) => {
  if (!url || typeof url !== 'string') return "/placeholder.svg";
  
  // Return the URL as-is to avoid broken transformations
  // The system was stable before we introduced complex optimization logic
  return url;
};
