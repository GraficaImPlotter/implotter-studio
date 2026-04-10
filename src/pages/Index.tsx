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
        beforeImage="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070" 
        afterImage="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070" 
        title="Transformação de Ambientes"
        subtitle="De espaços vazios a marcas vibrantes."
      />
      <ReviewsSection />
      <CTASection />
      <FAQSection />
    </PublicLayout>
  );
};

export default Index;
