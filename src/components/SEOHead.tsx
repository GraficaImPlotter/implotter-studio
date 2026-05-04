import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}

const SITE_NAME = "Gráfica ImPlotter";
const DEFAULT_DESCRIPTION = "Impressão profissional de alta qualidade: banners, adesivos, cartões, panfletos e muito mais. Entrega rápida e preço justo.";
const SITE_URL = "https://graficaimplotter.com.br";

const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Impressão Profissional`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={`${SITE_URL}${canonical}`} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={`${SITE_URL}${canonical}`} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content={SITE_NAME} />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
