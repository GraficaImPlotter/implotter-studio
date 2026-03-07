import type { BannerSlide } from '@/components/HeroCarousel';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string | null; // null = categoria principal, string = subcategoria
}

export interface ProductVariation {
  label: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string; // aponta para subcategoria (ou categoria principal se não houver sub)
  is_featured: boolean;
  price: number;
  description: string;
  longDescription: string;
  image: string;
  variations: ProductVariation[];
  is_featured?: boolean;
}

export type OrderStatus = 'novo' | 'em_producao' | 'finalizado' | 'entregue';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  variations: Record<string, string>;
}

export interface Order {
  id: string;
  clientName: string;
  clientEmail: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export const categories: Category[] = [
  // Categorias Principais
  { id: 'cat-1', name: 'Cartões de Visita', slug: 'cartoes-de-visita', description: 'Cartões profissionais de alta qualidade', icon: 'CreditCard', parentId: null },
  { id: 'cat-2', name: 'Banners & Faixas', slug: 'banners-faixas', description: 'Impressões em grande formato', icon: 'Flag', parentId: null },
  { id: 'cat-3', name: 'Adesivos', slug: 'adesivos', description: 'Adesivos personalizados em diversos materiais', icon: 'Sticker', parentId: null },
  { id: 'cat-4', name: 'Flyers & Panfletos', slug: 'flyers-panfletos', description: 'Material promocional impactante', icon: 'FileText', parentId: null },
  { id: 'cat-5', name: 'Crachás & Convites', slug: 'crachas-convites', description: 'Crachás corporativos e convites elegantes', icon: 'BadgeCheck', parentId: null },
  { id: 'cat-6', name: 'Papelaria Corporativa', slug: 'papelaria-corporativa', description: 'Identidade visual completa para empresas', icon: 'Building2', parentId: null },

  // Subcategorias — Cartões de Visita
  { id: 'sub-1-1', name: 'Couchê 300g', slug: 'couche-300g', description: 'Cartões em papel couchê 300g', icon: '', parentId: 'cat-1' },
  { id: 'sub-1-2', name: 'Reciclato', slug: 'reciclato', description: 'Cartões em papel reciclado', icon: '', parentId: 'cat-1' },
  { id: 'sub-1-3', name: 'Verniz Localizado', slug: 'verniz-localizado', description: 'Cartões com verniz UV localizado', icon: '', parentId: 'cat-1' },

  // Subcategorias — Banners & Faixas
  { id: 'sub-2-1', name: 'Lona 440g', slug: 'lona-440g', description: 'Banners em lona de alta resistência', icon: '', parentId: 'cat-2' },
  { id: 'sub-2-2', name: 'Tecido Sublimado', slug: 'tecido-sublimado', description: 'Banners em tecido com sublimação', icon: '', parentId: 'cat-2' },
  { id: 'sub-2-3', name: 'Faixas para Eventos', slug: 'faixas-eventos', description: 'Faixas personalizadas para eventos', icon: '', parentId: 'cat-2' },

  // Subcategorias — Adesivos
  { id: 'sub-3-1', name: 'Vinil Recortado', slug: 'vinil-recortado', description: 'Adesivos em vinil com recorte eletrônico', icon: '', parentId: 'cat-3' },
  { id: 'sub-3-2', name: 'Papel Couchê / Kraft', slug: 'papel-couche-kraft', description: 'Adesivos em papel para embalagens e rótulos', icon: '', parentId: 'cat-3' },
  { id: 'sub-3-3', name: 'Transparente', slug: 'transparente', description: 'Adesivos em vinil transparente', icon: '', parentId: 'cat-3' },

  // Subcategorias — Flyers & Panfletos
  { id: 'sub-4-1', name: 'Flyer A5', slug: 'flyer-a5', description: 'Flyers em formato A5', icon: '', parentId: 'cat-4' },
  { id: 'sub-4-2', name: 'Panfleto A4 Dobrável', slug: 'panfleto-a4-dobravel', description: 'Panfletos A4 com dobra', icon: '', parentId: 'cat-4' },

  // Subcategorias — Crachás & Convites
  { id: 'sub-5-1', name: 'Crachá PVC', slug: 'cracha-pvc', description: 'Crachás em PVC rígido', icon: '', parentId: 'cat-5' },
  { id: 'sub-5-2', name: 'Convites Premium', slug: 'convites-premium', description: 'Convites em papel especial', icon: '', parentId: 'cat-5' },

  // Subcategorias — Papelaria Corporativa
  { id: 'sub-6-1', name: 'Papel Timbrado', slug: 'papel-timbrado', description: 'Papel timbrado A4', icon: '', parentId: 'cat-6' },
  { id: 'sub-6-2', name: 'Envelopes', slug: 'envelopes', description: 'Envelopes personalizados', icon: '', parentId: 'cat-6' },
  { id: 'sub-6-3', name: 'Pastas', slug: 'pastas', description: 'Pastas corporativas personalizadas', icon: '', parentId: 'cat-6' },
];

export const products: Product[] = [
  {
    id: 'prod-1', name: 'Cartão de Visita Premium', slug: 'cartao-visita-premium', categoryId: 'sub-1-1',
    price: 89.90,
    description: 'Cartão de visita em papel couchê 300g com acabamento sofisticado.',
    longDescription: 'Cartão de visita impresso em papel couchê 300g com impressão frente e verso em alta definição. Ideal para causar uma primeira impressão profissional e marcante. Disponível em diversos acabamentos para se adequar à sua identidade visual.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Acabamento', options: ['Fosco', 'Brilho', 'Laminação Soft Touch'] },
      { label: 'Quantidade', options: ['100 un', '250 un', '500 un', '1000 un'] },
      { label: 'Cantos', options: ['Retos', 'Arredondados'] },
    ],
  },
  {
    id: 'prod-2', name: 'Cartão de Visita Verniz Localizado', slug: 'cartao-visita-verniz', categoryId: 'sub-1-3',
    price: 119.90,
    description: 'Cartão com verniz UV localizado que destaca elementos do seu design.',
    longDescription: 'Cartão de visita sofisticado com aplicação de verniz UV localizado, criando um contraste tátil e visual único. Impresso em couchê 300g com fundo fosco e elementos em alto brilho.',
    image: 'https://images.unsplash.com/photo-1572502742720-3c68e05a0948?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Quantidade', options: ['100 un', '250 un', '500 un'] },
      { label: 'Cantos', options: ['Retos', 'Arredondados'] },
    ],
  },
  {
    id: 'prod-13', name: 'Cartão Reciclato Ecológico', slug: 'cartao-reciclato', categoryId: 'sub-1-2',
    price: 99.90,
    description: 'Cartão de visita em papel reciclado, ideal para marcas sustentáveis.',
    longDescription: 'Cartão de visita impresso em papel reciclato 300g com textura natural. Perfeito para empresas que valorizam sustentabilidade. Impressão em alta definição com acabamento rústico e elegante.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Acabamento', options: ['Natural', 'Fosco'] },
      { label: 'Quantidade', options: ['100 un', '250 un', '500 un'] },
    ],
  },
  {
    id: 'prod-3', name: 'Banner em Lona 440g', slug: 'banner-lona', categoryId: 'sub-2-1',
    price: 45.00,
    description: 'Banner em lona de alta resistência, perfeito para fachadas e eventos.',
    longDescription: 'Banner impresso em lona vinílica 440g com impressão digital em alta resolução. Resistente a sol e chuva, ideal para uso externo. Inclui acabamento com bastão e corda ou ilhós.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Tamanho', options: ['1x0.5m', '2x1m', '3x1m', '4x1.5m'] },
      { label: 'Acabamento', options: ['Ilhós', 'Bastão e Corda', 'Sem acabamento'] },
    ],
  },
  {
    id: 'prod-4', name: 'Faixa para Eventos', slug: 'faixa-eventos', categoryId: 'sub-2-3',
    price: 75.00,
    description: 'Faixa personalizada para eventos, inaugurações e promoções.',
    longDescription: 'Faixa em lona 280g ou tecido, ideal para eventos corporativos, inaugurações e campanhas promocionais. Impressão em alta definição com cores vibrantes e duráveis.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Material', options: ['Lona 280g', 'Tecido Sublimado'] },
      { label: 'Tamanho', options: ['3x0.7m', '5x1m', '8x1.2m'] },
    ],
  },
  {
    id: 'prod-14', name: 'Banner Tecido Sublimado', slug: 'banner-tecido', categoryId: 'sub-2-2',
    price: 85.00,
    description: 'Banner em tecido com sublimação, acabamento premium para stands e feiras.',
    longDescription: 'Banner em tecido de poliéster com impressão por sublimação. Cores vibrantes, lavável e reutilizável. Ideal para stands, feiras, congressos e eventos corporativos.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Tamanho', options: ['1x2m', '2x2m', '3x2m'] },
      { label: 'Acabamento', options: ['Bastão', 'Ilhós', 'Bolso para estrutura'] },
    ],
  },
  {
    id: 'prod-5', name: 'Adesivo Vinil Recortado', slug: 'adesivo-vinil', categoryId: 'sub-3-1',
    price: 35.00,
    description: 'Adesivo em vinil recortado a laser para aplicação em vidros e veículos.',
    longDescription: 'Adesivo em vinil de alta aderência com recorte eletrônico de precisão. Ideal para aplicação em vidros, veículos, paredes e superfícies lisas. Resistente a água e raios UV.',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Tamanho', options: ['10x10cm', '20x20cm', '30x30cm', 'Personalizado'] },
      { label: 'Cor do Vinil', options: ['Branco', 'Preto', 'Dourado', 'Prata'] },
    ],
  },
  {
    id: 'prod-6', name: 'Adesivo em Papel', slug: 'adesivo-papel', categoryId: 'sub-3-2',
    price: 25.00,
    description: 'Adesivos em papel couchê ou kraft, ideais para embalagens e rótulos.',
    longDescription: 'Adesivos impressos em papel couchê brilho ou kraft, perfeitos para personalizar embalagens, garrafas e produtos artesanais. Impressão em alta qualidade com cores vibrantes.',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Papel', options: ['Couchê Brilho', 'Kraft'] },
      { label: 'Formato', options: ['Redondo', 'Quadrado', 'Retangular', 'Personalizado'] },
      { label: 'Quantidade', options: ['50 un', '100 un', '250 un', '500 un'] },
    ],
  },
  {
    id: 'prod-15', name: 'Adesivo Transparente', slug: 'adesivo-transparente', categoryId: 'sub-3-3',
    price: 40.00,
    description: 'Adesivo em vinil transparente para vidros e superfícies claras.',
    longDescription: 'Adesivo em vinil transparente com impressão digital UV. Ideal para vitrines, vidros de lojas e aplicação em superfícies onde se deseja manter a visibilidade. Alta aderência e resistência.',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Tamanho', options: ['20x20cm', '30x30cm', '50x50cm', 'Personalizado'] },
      { label: 'Quantidade', options: ['10 un', '25 un', '50 un'] },
    ],
  },
  {
    id: 'prod-7', name: 'Flyer A5 Promocional', slug: 'flyer-a5', categoryId: 'sub-4-1',
    price: 149.90,
    description: 'Flyers em formato A5 para divulgação de promoções e eventos.',
    longDescription: 'Flyer em formato A5 (15x21cm) impresso em papel couchê 150g com impressão frente e verso. Cores vibrantes e acabamento profissional para divulgação de promoções, eventos e novidades.',
    image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Acabamento', options: ['Sem acabamento', 'Fosco', 'Brilho'] },
      { label: 'Quantidade', options: ['500 un', '1000 un', '2500 un', '5000 un'] },
    ],
  },
  {
    id: 'prod-8', name: 'Panfleto A4 Dobrável', slug: 'panfleto-a4', categoryId: 'sub-4-2',
    price: 199.90,
    description: 'Panfletos A4 com opção de dobra, perfeitos para cardápios e informativos.',
    longDescription: 'Panfleto em formato A4 impresso em couchê 170g, com opção de dobra (1, 2 ou 3 dobras). Ideal para cardápios, catálogos de produtos e material informativo corporativo.',
    image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Dobra', options: ['Sem dobra', '1 dobra', '2 dobras', '3 dobras (sanfona)'] },
      { label: 'Quantidade', options: ['250 un', '500 un', '1000 un'] },
    ],
  },
  {
    id: 'prod-9', name: 'Crachá PVC Personalizado', slug: 'cracha-pvc', categoryId: 'sub-5-1',
    price: 12.90,
    description: 'Crachá em PVC resistente com impressão digital direta.',
    longDescription: 'Crachá corporativo em PVC rígido com impressão digital UV direta. Resistente e durável, com opção de furo para cordão ou clip. Ideal para identificação de funcionários e eventos.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Acabamento', options: ['Furo para cordão', 'Clip traseiro', 'Furo + Clip'] },
      { label: 'Quantidade', options: ['10 un', '25 un', '50 un', '100 un'] },
    ],
  },
  {
    id: 'prod-10', name: 'Convite Premium', slug: 'convite-premium', categoryId: 'sub-5-2',
    price: 4.50,
    description: 'Convites elegantes para casamentos, aniversários e eventos corporativos.',
    longDescription: 'Convite impresso em papel especial (Markatto, Vergê ou Aspen) com acabamento refinado. Disponível com hot stamping dourado ou prata para um toque de luxo. Inclui envelope.',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Papel', options: ['Markatto Stile', 'Vergê', 'Aspen'] },
      { label: 'Hot Stamping', options: ['Sem', 'Dourado', 'Prata', 'Rosê'] },
      { label: 'Quantidade', options: ['50 un', '100 un', '150 un', '200 un'] },
    ],
  },
  {
    id: 'prod-11', name: 'Papel Timbrado A4', slug: 'papel-timbrado', categoryId: 'sub-6-1',
    price: 179.90,
    description: 'Papel timbrado profissional para correspondências e documentos oficiais.',
    longDescription: 'Papel timbrado em formato A4, impresso em papel offset 90g ou couchê 120g. Transmite profissionalismo e reforça a identidade visual da sua empresa em todas as comunicações.',
    image: 'https://images.unsplash.com/photo-1568702846914-96b305d2ead1?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Papel', options: ['Offset 90g', 'Couchê 120g'] },
      { label: 'Quantidade', options: ['250 un', '500 un', '1000 un'] },
    ],
  },
  {
    id: 'prod-12', name: 'Envelope Personalizado', slug: 'envelope-personalizado', categoryId: 'sub-6-2',
    price: 249.90,
    description: 'Envelopes com impressão da marca para correspondências profissionais.',
    longDescription: 'Envelopes personalizados com a identidade visual da sua empresa. Disponíveis nos formatos ofício e carta, impressos em papel offset 90g. Perfeitos para envio de documentos, propostas e correspondências oficiais.',
    image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=600&h=400&fit=crop',
    is_featured: false,
    variations: [
      { label: 'Formato', options: ['Carta (16x22cm)', 'Ofício (24x34cm)', 'Saco (26x36cm)'] },
      { label: 'Quantidade', options: ['250 un', '500 un', '1000 un'] },
    ],
  },
];

export const orders: Order[] = [
  {
    id: 'ped-001', clientName: 'Maria Silva', clientEmail: 'maria@email.com',
    items: [{ productId: 'prod-1', productName: 'Cartão de Visita Premium', quantity: 1, unitPrice: 89.90, variations: { Acabamento: 'Laminação Soft Touch', Quantidade: '500 un', Cantos: 'Arredondados' } }],
    total: 89.90, status: 'novo', createdAt: '2026-03-06T10:30:00',
  },
  {
    id: 'ped-002', clientName: 'João Santos', clientEmail: 'joao@email.com',
    items: [{ productId: 'prod-3', productName: 'Banner em Lona 440g', quantity: 2, unitPrice: 45.00, variations: { Tamanho: '2x1m', Acabamento: 'Ilhós' } }],
    total: 90.00, status: 'em_producao', createdAt: '2026-03-05T14:00:00',
  },
  {
    id: 'ped-003', clientName: 'Ana Oliveira', clientEmail: 'ana@email.com',
    items: [
      { productId: 'prod-7', productName: 'Flyer A5 Promocional', quantity: 1, unitPrice: 149.90, variations: { Acabamento: 'Brilho', Quantidade: '1000 un' } },
      { productId: 'prod-5', productName: 'Adesivo Vinil Recortado', quantity: 3, unitPrice: 35.00, variations: { Tamanho: '20x20cm', 'Cor do Vinil': 'Branco' } },
    ],
    total: 254.90, status: 'finalizado', createdAt: '2026-03-04T09:15:00',
  },
  {
    id: 'ped-004', clientName: 'Carlos Mendes', clientEmail: 'carlos@email.com',
    items: [{ productId: 'prod-11', productName: 'Papel Timbrado A4', quantity: 1, unitPrice: 179.90, variations: { Papel: 'Couchê 120g', Quantidade: '500 un' } }],
    total: 179.90, status: 'entregue', createdAt: '2026-03-01T16:45:00',
  },
  {
    id: 'ped-005', clientName: 'Fernanda Lima', clientEmail: 'fernanda@email.com',
    items: [{ productId: 'prod-9', productName: 'Crachá PVC Personalizado', quantity: 50, unitPrice: 12.90, variations: { Acabamento: 'Furo para cordão', Quantidade: '50 un' } }],
    total: 645.00, status: 'em_producao', createdAt: '2026-03-05T11:20:00',
  },
  {
    id: 'ped-006', clientName: 'Roberto Costa', clientEmail: 'roberto@email.com',
    items: [{ productId: 'prod-4', productName: 'Faixa para Eventos', quantity: 1, unitPrice: 75.00, variations: { Material: 'Tecido Sublimado', Tamanho: '5x1m' } }],
    total: 75.00, status: 'novo', createdAt: '2026-03-06T08:00:00',
  },
  {
    id: 'ped-007', clientName: 'Luciana Alves', clientEmail: 'luciana@email.com',
    items: [{ productId: 'prod-10', productName: 'Convite Premium', quantity: 100, unitPrice: 4.50, variations: { Papel: 'Markatto Stile', 'Hot Stamping': 'Dourado', Quantidade: '100 un' } }],
    total: 450.00, status: 'finalizado', createdAt: '2026-03-03T13:00:00',
  },
  {
    id: 'ped-008', clientName: 'Pedro Rocha', clientEmail: 'pedro@email.com',
    items: [
      { productId: 'prod-12', productName: 'Envelope Personalizado', quantity: 1, unitPrice: 249.90, variations: { Formato: 'Ofício (24x34cm)', Quantidade: '500 un' } },
      { productId: 'prod-11', productName: 'Papel Timbrado A4', quantity: 1, unitPrice: 179.90, variations: { Papel: 'Offset 90g', Quantidade: '500 un' } },
    ],
    total: 429.80, status: 'entregue', createdAt: '2026-02-28T10:00:00',
  },
];

export const statusLabels: Record<OrderStatus, string> = {
  novo: 'Novo',
  em_producao: 'Em Produção',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
};

export const statusColors: Record<OrderStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_producao: 'bg-yellow-100 text-yellow-800',
  finalizado: 'bg-green-100 text-green-800',
  entregue: 'bg-muted text-muted-foreground',
};

// Helper functions

export function getMainCategories(): Category[] {
  return categories.filter(c => c.parentId === null);
}

export function getSubcategories(parentId: string): Category[] {
  return categories.filter(c => c.parentId === parentId);
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter(p => p.categoryId === categoryId);
}

/** Returns products for a main category (all its subcategories) or a specific subcategory */
export function getProductsByCategoryTree(categoryId: string): Product[] {
  const cat = getCategoryById(categoryId);
  if (!cat) return [];
  // If it's a main category, get products from all its subcategories
  if (cat.parentId === null) {
    const subIds = getSubcategories(categoryId).map(s => s.id);
    // Include products directly in the main cat + in subcategories
    return products.filter(p => p.categoryId === categoryId || subIds.includes(p.categoryId));
  }
  // If it's a subcategory, just filter directly
  return products.filter(p => p.categoryId === categoryId);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}

/** Get the full category label for a product (e.g. "Cartões de Visita > Couchê 300g") */
export function getCategoryFullName(categoryId: string): string {
  const cat = getCategoryById(categoryId);
  if (!cat) return '—';
  if (cat.parentId) {
    const parent = getCategoryById(cat.parentId);
    return parent ? `${parent.name} > ${cat.name}` : cat.name;
  }
  return cat.name;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const banners: BannerSlide[] = [
  {
    id: 'banner-1',
    image: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=1600&h=600&fit=crop',
    title: 'Promoção de Panfletos',
    subtitle: '1000 panfletos A5 coloridos frente e verso por apenas R$ 149,90. Divulgue sua marca com qualidade ImPlotter!',
    buttonText: 'Aproveite Agora',
    buttonLink: '/servicos?cat=cat-4',
    active: true,
  },
  {
    id: 'banner-2',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&h=600&fit=crop',
    title: 'Novos Banners em Lona',
    subtitle: 'Banners em lona 440g com impressão de alta resolução. Resistentes ao sol e chuva. Peça já o seu!',
    buttonText: 'Ver Banners',
    buttonLink: '/servicos?cat=cat-2',
    active: true,
  },
  {
    id: 'banner-3',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1600&h=600&fit=crop',
    title: 'Cartões de Visita Premium',
    subtitle: 'Cause uma primeira impressão memorável. Acabamento Soft Touch, verniz localizado e muito mais.',
    buttonText: 'Conheça os Modelos',
    buttonLink: '/servicos?cat=cat-1',
    active: true,
  },
  {
    id: 'banner-4',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1600&h=600&fit=crop',
    title: 'Adesivos Personalizados',
    subtitle: 'Vinil, papel, recortados ou em rolo. Perfeitos para embalagens, veículos e vitrines.',
    buttonText: 'Peça o Seu',
    buttonLink: '/servicos?cat=cat-3',
    active: false,
  },
];
