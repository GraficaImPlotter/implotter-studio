export const generateSlug = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const generateMetaTitle = (name: string): string =>
  `${name} | Gráfica ImPlotter`;

export const generateMetaDescription = (name: string): string =>
  `Compre ${name} com qualidade profissional na Gráfica ImPlotter. Envio rápido, preço justo e acabamento impecável.`;
