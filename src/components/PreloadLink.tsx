import { Link, LinkProps } from "react-router-dom";
import { useCallback } from "react";

// Map of route paths to their lazy import functions
const routeImports: Record<string, () => Promise<any>> = {
  "/": () => import("@/pages/Index"),
  "/loja": () => import("@/pages/Loja"),
  "/nossa-historia": () => import("@/pages/NossaHistoria"),
  "/blog": () => import("@/pages/Blog"),
  "/avaliacoes": () => import("@/pages/Avaliacoes"),
  "/fale-conosco": () => import("@/pages/FaleConosco"),
  "/carrinho": () => import("@/pages/Carrinho"),
  "/faq": () => import("@/pages/FAQ"),
  "/rastrear": () => import("@/pages/RastrearPedido"),
  "/login": () => import("@/pages/Login"),
  "/cadastro": () => import("@/pages/Cadastro"),
  "/minha-conta": () => import("@/pages/MinhaConta"),
  "/afiliados": () => import("@/pages/Afiliados"),
};

const preloaded = new Set<string>();

const PreloadLink = ({ to, onMouseEnter, ...props }: LinkProps) => {
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const path = typeof to === "string" ? to : to.pathname || "";
      if (!preloaded.has(path) && routeImports[path]) {
        preloaded.add(path);
        routeImports[path]();
      }
      onMouseEnter?.(e);
    },
    [to, onMouseEnter]
  );

  return <Link to={to} onMouseEnter={handleMouseEnter} {...props} />;
};

export default PreloadLink;
