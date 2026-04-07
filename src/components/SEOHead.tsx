import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string;
}

const BASE_URL = "https://pla.soma.lefil.com.br";

export function SEOHead({
  title,
  description = "SoMA - Sistema operacional de Marketing. Gerencie demandas, equipes e produtividade com kanban, relatórios e muito mais.",
  path = "",
  keywords,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | SoMA` : "SoMA - Sistema Operacional de Marketing";
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
    </Helmet>
  );
}
