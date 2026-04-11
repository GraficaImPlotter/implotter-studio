import { lazy, Suspense } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/home/HeroSection";
import B2BCatalogueSection from "@/components/home/B2BCatalogueSection";
import PromoCarouselSection from "@/components/home/PromoCarouselSection";
import SegmentsSection from "@/components/home/SegmentsSection";

// Lazy assets below the fold
const KitsSection = lazy(() => import("@/components/home/KitsSection"));
const TrustBadgesSection = lazy(() => import("@/components/home/TrustBadgesSection"));
const HowItWorksSection = lazy(() => import("@/components/home/HowItWorksSection"));
const DifferentialsSection = lazy(() => import("@/components/home/DifferentialsSection"));
const ReviewsSection = lazy(() => import("@/components/home/ReviewsSection"));
const CTASection = lazy(() => import("@/components/home/CTASection"));
const FAQSection = lazy(() => import("@/components/home/FAQSection"));
const BeforeAfterSlider = lazy(() => import("@/components/home/BeforeAfterSlider").then(m => ({ default: m.BeforeAfterSlider })));

const SectionLoader = ({ height = "400px" }) => (
  <div style={{ height }} className="w-full flex items-center justify-center bg-background/50 animate-pulse">
    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

import { useSettings } from "@/hooks/use-settings";

const Index = () => {
  const { data: settings } = useSettings();

  const businessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": settings?.company_name || "Gráfica ImPlotter",
    "image": "https://graficaimplotter.shop/pwa-icon-512.png",
    "@id": "https://graficaimplotter.shop",
    "url": "https://graficaimplotter.shop",
    "telephone": settings?.phone || settings?.whatsapp || "",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings?.address || "",
      "addressLocality": settings?.city || "",
      "addressRegion": settings?.state || "",
      "addressCountry": "BR"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "18:00"
    }
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Gráfica ImPlotter",
    "url": "https://graficaimplotter.shop",
    "logo": "https://graficaimplotter.shop/pwa-icon-512.png",
    "sameAs": [
      settings?.instagram_url,
      settings?.facebook_url
    ].filter(Boolean)
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Gráfica Online | Banners, Adesivos e Cartões com Entrega Rápida"
        description="A Gráfica ImPlotter é especialista em impressos de alta qualidade. Banners, adesivos personalizados, cartões de visita e panfletos com o melhor preço e entrega ágil."
        canonical="/"
        jsonLd={[businessSchema, orgSchema]}
      />
      
      {/* Above the fold - Eager */}
      <HeroSection />
      <B2BCatalogueSection />
      <SegmentsSection />
      <PromoCarouselSection />

      {/* Below the fold - Lazy */}
      <Suspense fallback={<SectionLoader height="120px" />}>
        <TrustBadgesSection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <KitsSection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <HowItWorksSection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <DifferentialsSection />
      </Suspense>

      <Suspense fallback={<SectionLoader height="500px" />}>
        <BeforeAfterSlider 
          beforeImage="/images/antes.png" 
          afterImage="/images/depois.png" 
          title="Impacto que Gera Vendas"
          subtitle="Uma fachada bem sinalizada não é apenas decoração, é um imã de clientes."
        />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <ReviewsSection />
      </Suspense>

      <Suspense fallback={<SectionLoader height="300px" />}>
        <CTASection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <FAQSection />
      </Suspense>
    </PublicLayout>
  );
};

export default Index;
