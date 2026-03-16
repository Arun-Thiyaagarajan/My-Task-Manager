'use client';

import { useEffect } from 'react';
import { getUiConfig } from '@/lib/data';

/**
 * A headless component that synchronizes the Workspace Icon from settings 
 * to the browser's favicon and apple-touch-icon tags.
 */
export function FaviconSync() {
  useEffect(() => {
    const updateFavicon = () => {
      const config = getUiConfig();
      if (!config) return;

      const icon = config.appIcon;
      // Default placeholder if no icon is set
      let iconUrl = 'https://placehold.co/180x180/4f46e5/white/png?text=TF';

      if (icon) {
        const isDataURI = icon.startsWith('data:image');
        iconUrl = isDataURI 
          ? icon 
          : `https://placehold.co/180x180/4f46e5/white/png?text=${encodeURIComponent(icon)}`;
      }

      // 1. Update Standard Favicons
      const iconSelectors = ["link[rel='icon']", "link[rel='shortcut icon']"];
      let found = false;
      
      iconSelectors.forEach(selector => {
        const link = document.querySelector(selector) as HTMLLinkElement;
        if (link) {
          link.href = iconUrl;
          found = true;
        }
      });

      if (!found) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      }

      // 2. Update Apple Touch Icon (Mobile Home Screen)
      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = iconUrl;
    };

    // Initial run
    updateFavicon();

    // Listen for updates
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
