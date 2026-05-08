/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect } from "react";

interface SEOConfig {
  /** Page title — will be appended with " | PolymagicPrice" */
  title: string;
  /** Meta description for this page (optional, updates <meta name="description">) */
  description?: string;
  /** Canonical URL for this page (optional, updates <link rel="canonical">) */
  canonical?: string;
  /** Open Graph title (optional, defaults to title) */
  ogTitle?: string;
  /** Open Graph description (optional, defaults to description) */
  ogDescription?: string;
  /** Open Graph image URL (optional) */
  ogImage?: string;
  /** Robots directive (optional, e.g. "noindex, nofollow") */
  robots?: string;
}

const BRAND_SUFFIX = " | PolymagicPrice";
const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;


/**
 * Lightweight SEO hook that updates document.title, meta tags, and canonical links.
 * No external library needed (replaces react-helmet).
 */
export function useDocumentSEO({ 
  title, 
  description, 
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  robots
}: SEOConfig) {
  useEffect(() => {
    // 1. Set page title
    const fullTitle = title.includes("PolymagicPrice")
      ? title
      : `${title}${BRAND_SUFFIX}`;
    document.title = fullTitle;

    // 2. Helper to get or create meta tags
    const updateMetaTag = (nameOrProperty: string, content: string, isProperty = false) => {
      const selector = isProperty 
        ? `meta[property="${nameOrProperty}"]` 
        : `meta[name="${nameOrProperty}"]`;
      
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (element) {
        element.setAttribute("content", content);
      } else {
        element = document.createElement("meta");
        if (isProperty) {
          element.setAttribute("property", nameOrProperty);
        } else {
          element.name = nameOrProperty;
        }
        element.content = content;
        document.head.appendChild(element);
      }
    };

    // 3. Update standard meta tags
    if (description) updateMetaTag("description", description);
    if (robots) {
      updateMetaTag("robots", robots);
    } else {
      updateMetaTag("robots", "index, follow");
    }
    
    // 4. Update Canonical Link
    const fullCanonical = canonical 
      ? (canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`)
      : window.location.origin + window.location.pathname;
    
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (linkCanonical) {
      linkCanonical.setAttribute("href", fullCanonical);
    } else {
      linkCanonical = document.createElement("link");
      linkCanonical.rel = "canonical";
      linkCanonical.href = fullCanonical;
      document.head.appendChild(linkCanonical);
    }

    // 5. Update Open Graph Tags
    updateMetaTag("og:title", ogTitle || title, true);
    if (ogDescription || description) {
      updateMetaTag("og:description", ogDescription || description || "", true);
    }
    if (ogImage) {
      updateMetaTag("og:image", ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`, true);
    }
    updateMetaTag("og:url", fullCanonical, true);

    // 6. Update Twitter Tags
    updateMetaTag("twitter:title", ogTitle || title);
    if (ogDescription || description) {
      updateMetaTag("twitter:description", ogDescription || description || "");
    }
    if (ogImage) {
      updateMetaTag("twitter:image", ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`);
    }

    // Cleanup: not strictly necessary but keeps head clean
    return () => {
      // Default reset logic if needed, but SPA nav usually handles this via next hook call
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, robots]);
}

