import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/home/HeroSection";
import B2BCatalogueSection from "@/components/home/B2BCatalogueSection";
import PromoCarouselSection from "@/components/home/PromoCarouselSection";
import KitsSection from "@/components/home/KitsSection";
import TrustBadgesSection from "@/components/home/TrustBadgesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import DifferentialsSection from "@/components/home/DifferentialsSection";
import ReviewsSection from "@/components/home/ReviewsSection";
import CTASection from "@/components/home/CTASection";
import FAQSection from "@/components/home/FAQSection";
import { BeforeAfterSlider } from "@/components/home/BeforeAfterSlider";

const Index = () => {
  return (
    <PublicLayout>
      <SEOHead
        title="Impressão Profissional"
        description="Gráfica ImPlotter: banners, adesivos, cartões, panfletos e muito mais com qualidade profissional, entrega rápida e preço justo."
        canonical="/"
      />
      <HeroSection />
      <B2BCatalogueSection />
      <PromoCarouselSection />
      <TrustBadgesSection />
      <KitsSection />
      <HowItWorksSection />
      <DifferentialsSection />
      <BeforeAfterSlider 
        beforeImage="/images/antes.png" 
        afterImage="/images/depois.png" 
        title="Impacto que Gera Vendas"
        subtitle="Uma fachada bem sinalizada não é apenas decoração, é um imã de clientes."
      />
      <ReviewsSection />
      <CTASection />
      <FAQSection />
    </PublicLayout>
  );
};

export default Index;
