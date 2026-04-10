import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "../WhatsAppButton";
import { FloatingCart } from "../cart/FloatingCart";

import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import {
  computeBestProgressiveDiscount,
  fetchActiveProgressiveDiscountRules,
  type ProgressiveDiscountRule,
} from "@/lib/discounting";

// Defer non-critical widgets — they don't affect FCP/LCP
const CookieBanner = lazy(() => import("../CookieBanner"));
const AIChatWidget = lazy(() => import("../AIChatWidget"));
const OfferPopup = lazy(() => import("../OfferPopup"));
const ExitIntentPopup = lazy(() => import("../ExitIntentPopup"));
const BackToTopButton = lazy(() => import("../BackToTopButton"));
const SocialProofToast = lazy(() => import("../SocialProofToast"));
const AbandonedCartRecovery = lazy(() => import("../AbandonedCartRecovery"));
const ScrollLeadCapture = lazy(() => import("../ScrollLeadCapture"));

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const { items, couponCode, setProgressiveDiscount } = useCart();
  const [rules, setRules] = useState<ProgressiveDiscountRule[]>([]);

  useEffect(() => {
    let active = true;
    fetchActiveProgressiveDiscountRules()
      .then((r) => {
        if (active) setRules(r);
      })
      .catch(async () => {
        const { data } = await supabase
          .from("progressive_discounts")
          .select("id, name, discount_type, discount_value, min_quantity, min_value, is_active")
          .eq("is_active", true);
        if (active) setRules((data ?? []) as any);
      });

    return () => {
      active = false;
    };
  }, []);

  const bestProgressive = useMemo(() => {
    if (couponCode) return { discount: 0, ruleId: null, ruleName: null };
    if (!items.length) return { discount: 0, ruleId: null, ruleName: null };
    return computeBestProgressiveDiscount(items, rules);
  }, [couponCode, items, rules]);

  useEffect(() => {
    if (couponCode) {
      setProgressiveDiscount({ discount: 0, ruleName: null });
      return;
    }

    setProgressiveDiscount({ discount: bestProgressive.discount, ruleName: bestProgressive.ruleName });
  }, [bestProgressive.discount, bestProgressive.ruleName, couponCode, setProgressiveDiscount]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
      <Footer />
      <WhatsAppButton />
      <Suspense fallback={null}>
        {/* <AIChatWidget /> Desativado temporariamente pela dupla arquitetura */}
        <CookieBanner />
        <OfferPopup />
        <ExitIntentPopup />
        <BackToTopButton />
        <SocialProofToast />
        <AbandonedCartRecovery />
        <ScrollLeadCapture />
      </Suspense>
      <FloatingCart />
    </div>
  );
};

export default PublicLayout;
