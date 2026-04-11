export const getOptimizedUrl = (url: string, { width, quality = 80, format = 'webp' }: { width?: number, quality?: number, format?: string } = {}) => {
  if (!url) return "/placeholder.svg";
  
  // Se não for uma URL completa (ex: path relativo do Supabase), retorna como está
  if (!url.startsWith("http")) return url;

  // Otimização Unsplash - Preserva parâmetros originais e adiciona os nossos
  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      if (width) urlObj.searchParams.set("w", String(width));
      urlObj.searchParams.set("q", String(quality));
      urlObj.searchParams.set("fm", format);
      urlObj.searchParams.set("auto", "format,compress");
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }

  // Otimização Supabase Storage (se habilitado no bucket)
  if (url.includes(".supabase.co/storage/v1/object/public/")) {
    try {
      // Retorna a URL original se for um SVG (não precisa de transformação)
      if (url.toLowerCase().endsWith('.svg')) return url;

      const urlObj = new URL(url);
      // Supabase transformation path is /storage/v1/render/image/public/
      const newPath = urlObj.pathname.replace("/object/public/", "/render/image/public/");
      urlObj.pathname = newPath;
      if (width) urlObj.searchParams.set("width", String(width));
      urlObj.searchParams.set("quality", String(quality));
      urlObj.searchParams.set("format", format || "webp");
      urlObj.searchParams.set("resize", "contain"); 
      return urlObj.toString();
    } catch (e) {
      console.warn("Erro ao otimizar imagem Supabase, usando original:", e);
      return url;
    }
  }

  return url;
