import { lazy, Suspense } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/home/HeroSection";
import B2BCatalogueSection from "@/components/home/B2BCatalogueSection";
import PromoCarouselSection from "@/components/home/PromoCarouselSection";

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

const Index = () => {
  return (
    <PublicLayout>
      <SEOHead
        title="Impressão Profissional"
        description="Gráfica ImPlotter: banners, adesivos, cartões, panfletos e muito mais com qualidade profissional, entrega rápida e preço justo."
        canonical="/"
      />
      
      {/* Above the fold - Eager */}
      <HeroSection />
      <B2BCatalogueSection />
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
