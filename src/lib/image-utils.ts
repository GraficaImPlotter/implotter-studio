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

  // Para Supabase ou outras fontes externas não mapeadas, retornamos a URL original
  // para evitar quebras por parâmetros de segurança (tokens) ausentes.
  return url;
};
