'use client';

import { useEffect } from 'react';
import { getUiConfig } from '@/lib/data';

/**
 * A headless component that synchronizes the Workspace Icon from settings 
 * to the browser's favicon and apple-touch-icon tags.
 * This ensures custom branding appears in tabs and mobile home screens.
 */
export function FaviconSync() {
  useEffect(() => {
    const updateFavicon = () => {
      const config = getUiConfig();
      if (!config) return;

      const icon = config.appIcon;
      // Use the built-in TaskFlow brand icon when no custom icon is configured.
      const defaultIconUrl = '/apple-icon';
      let iconUrl = defaultIconUrl;

      if (icon) {
        const isDataURI = icon.startsWith('data:image');
        iconUrl = isDataURI 
          ? icon 
          : `https://placehold.co/180x180/4f46e5/white/png?text=${encodeURIComponent(icon)}`;
      }

      // 1. Update/Clean Standard Favicons
      // We look for all possible icon tags to ensure we override framework defaults
      const iconSelectors = [
        "link[rel='icon']", 
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']"
      ];
      
      iconSelectors.forEach(selector => {
        const links = document.querySelectorAll(selector);
        if (links.length > 0) {
          links.forEach(link => {
            (link as HTMLLinkElement).href = iconUrl;
          });
        } else {
          // If not found, create the primary ones
          const rel = selector.split("'")[1];
          const newLink = document.createElement('link');
          newLink.rel = rel;
          newLink.href = iconUrl;
          document.head.appendChild(newLink);
        }
      });

      // Update document title potentially if icon changed (triggers browser to notice favicon change)
      const originalTitle = document.title;
      document.title = originalTitle + " ";
      setTimeout(() => {
        document.title = originalTitle;
      }, 50);
    };

    // Initial run
    updateFavicon();

    // Listen for updates from settings or storage
    window.addEventListener('config-changed', updateFavicon);
    window.addEventListener('company-changed', updateFavicon);
    window.addEventListener('storage', updateFavicon);

    return () => {
      window.removeEventListener('config-changed', updateFavicon);
      window.removeEventListener('company-changed', updateFavicon);
      window.removeEventListener('storage', updateFavicon);
    };
  }, []);

  return null;
}
