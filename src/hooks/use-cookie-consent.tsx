import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export interface CookieConsent {
  preferences: CookiePreferences;
  consentDate: string;
  consentType: "full" | "minimal" | "custom";
}

interface CookieConsentContextType {
  consent: CookieConsent | null;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  isAllowed: (category: keyof CookiePreferences) => boolean;
}

const STORAGE_KEY = "implotter_cookie_consent";

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

function loadConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function persistConsent(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

/** Fire/revoke optional scripts based on consent */
function applyScriptControl(prefs: CookiePreferences) {
  // Dispatch a custom event so any script loader can listen
  window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: prefs }));

  // Example: dataLayer push for GTM
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: "cookie_consent_update",
      analytics_consent: prefs.analytics ? "granted" : "denied",
      marketing_consent: prefs.marketing ? "granted" : "denied",
      functional_consent: prefs.functional ? "granted" : "denied",
    });
  }

  // Google consent mode v2 (if gtag exists)
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("consent", "update", {
      analytics_storage: prefs.analytics ? "granted" : "denied",
      ad_storage: prefs.marketing ? "granted" : "denied",
      ad_user_data: prefs.marketing ? "granted" : "denied",
      ad_personalization: prefs.marketing ? "granted" : "denied",
      functionality_storage: prefs.functional ? "granted" : "denied",
    });
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadConsent();
    if (saved) {
      setConsent(saved);
      applyScriptControl(saved.preferences);
    } else {
      setShowBanner(true);
    }
    setLoaded(true);
  }, []);

  const save = useCallback((prefs: CookiePreferences, type: CookieConsent["consentType"]) => {
    const c: CookieConsent = {
      preferences: prefs,
      consentDate: new Date().toISOString(),
      consentType: type,
    };
    setConsent(c);
    persistConsent(c);
    setShowBanner(false);
    setShowPreferences(false);
    applyScriptControl(prefs);
  }, []);

  const acceptAll = useCallback(() => {
    save({ necessary: true, analytics: true, marketing: true, functional: true }, "full");
  }, [save]);

  const rejectOptional = useCallback(() => {
    save({ necessary: true, analytics: false, marketing: false, functional: false }, "minimal");
  }, [save]);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    save({ ...prefs, necessary: true }, "custom");
  }, [save]);

  const openPreferences = useCallback(() => setShowPreferences(true), []);
  const closePreferences = useCallback(() => setShowPreferences(false), []);

  const isAllowed = useCallback((category: keyof CookiePreferences) => {
    if (category === "necessary") return true;
    return consent?.preferences[category] ?? false;
  }, [consent]);

  if (!loaded) return <>{children}</>;

  return (
    <CookieConsentContext.Provider
      value={{ consent, showBanner, showPreferences, acceptAll, rejectOptional, savePreferences, openPreferences, closePreferences, isAllowed }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. admin pages)
    return {
      consent: null,
      showBanner: false,
      showPreferences: false,
      acceptAll: () => {},
      rejectOptional: () => {},
      savePreferences: () => {},
      openPreferences: () => {},
      closePreferences: () => {},
      isAllowed: () => false,
    } as CookieConsentContextType;
  }
  return ctx;
}
