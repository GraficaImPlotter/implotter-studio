import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "../WhatsAppButton";
import { FloatingCart } from "../cart/FloatingCart";
import { cn } from "@/lib/utils";

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
  const [activeTheme, setActiveTheme] = useState("default");

  useEffect(() => {
     supabase.from("site_settings").select("value").eq("key", "active_theme").maybeSingle().then(({ data }) => {
        if (data?.value) setActiveTheme(data.value);
     });
  }, []);

  const themeStyles = useMemo(() => {
    if (activeTheme === "black_friday") {
      return {
        "--primary": "217 30% 10%",
        "--primary-foreground": "45 100% 50%", // Yellow/Gold
        "--highlight": "45 100% 50%",
        "--highlight-glow": "45 100% 50% / 0.5",
      } as React.CSSProperties;
    }
    if (activeTheme === "natal") {
      return {
        "--primary": "0 84% 40%", // Festive Red
        "--primary-foreground": "45 100% 70%", // Soft Gold
        "--highlight": "0 84% 60%",
        "--highlight-glow": "0 84% 60% / 0.5",
      } as React.CSSProperties;
    }
    return {} as React.CSSProperties; // Default
  }, [activeTheme]);

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
    <div className={cn("min-h-screen flex flex-col bg-background", activeTheme !== "default" && "seasonal-theme")} style={themeStyles}>
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <AIChatWidget />
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
