import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string;
}

const BASE_URL = "https://pla.soma.lefil.com.br";
const DEFAULT_TITLE = "SoMA - Sistema Operacional de Marketing";
const DEFAULT_DESCRIPTION =
  "SoMA - Sistema operacional de Marketing. Gerencie demandas, equipes e produtividade com kanban, relatórios e muito mais.";

const upsertMetaTag = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  const created = !element;

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  const previousAttributes = Object.fromEntries(
    Object.keys(attributes).map((key) => [key, element!.getAttribute(key)])
  );

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value);
  });

  return () => {
    if (created) {
      element?.remove();
      return;
    }

    Object.entries(previousAttributes).forEach(([key, value]) => {
      if (value === null) {
        element?.removeAttribute(key);
      } else {
        element?.setAttribute(key, value);
      }
    });
  };
};

const upsertCanonicalLink = (href: string) => {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  const created = !element;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  const previousHref = element.getAttribute("href");
  element.setAttribute("href", href);

  return () => {
    if (created) {
      element?.remove();
      return;
    }

    if (previousHref === null) {
      element?.removeAttribute("href");
    } else {
      element?.setAttribute("href", previousHref);
    }
  };
};

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  keywords,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | SoMA` : DEFAULT_TITLE;
    const canonicalUrl = `${BASE_URL}${path}`;
    const previousTitle = document.title;

    document.title = fullTitle;

    const cleanups = [
      upsertMetaTag('meta[name="description"]', { name: "description", content: description }),
      upsertCanonicalLink(canonicalUrl),
      upsertMetaTag('meta[property="og:title"]', { property: "og:title", content: fullTitle }),
      upsertMetaTag('meta[property="og:description"]', { property: "og:description", content: description }),
      upsertMetaTag('meta[property="og:url"]', { property: "og:url", content: canonicalUrl }),
      upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle }),
      upsertMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: description }),
    ];

    if (keywords) {
      cleanups.push(upsertMetaTag('meta[name="keywords"]', { name: "keywords", content: keywords }));
    }

    return () => {
      document.title = previousTitle;
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, [description, keywords, path, title]);

  return null;
}
