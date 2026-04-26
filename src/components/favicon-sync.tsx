'use client';

import { useEffect } from 'react';
import { getUiConfig } from '@/lib/data';

const DEFAULT_WORKSPACE_ICON_URL = '/workspace-icon.svg';

function isImageUrl(value: string) {
  return /^(https?:\/\/|\/|\.\/|\.\.\/|blob:)/i.test(value) || value.startsWith('data:image');
}

function buildTextIconDataUrl(value: string) {
  const iconText = Array.from(value.trim()).slice(0, 2).join('') || 'T';
  const fontSize = iconText.length > 1 ? 108 : 132;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" rx="42" fill="#4f46e5"/>
      <circle cx="48" cy="36" r="54" fill="#ffffff" opacity=".18"/>
      <text x="90" y="108" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Arial, sans-serif">${escapeSvgText(iconText)}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildRoundedImageIconDataUrl(imageUrl: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <defs>
        <clipPath id="taskflow-favicon-clip">
          <rect x="6" y="6" width="168" height="168" rx="44"/>
        </clipPath>
      </defs>
      <rect width="180" height="180" rx="44" fill="transparent"/>
      <image href="${escapeSvgAttribute(imageUrl)}" x="6" y="6" width="168" height="168" preserveAspectRatio="xMidYMid slice" clip-path="url(#taskflow-favicon-clip)"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeSvgAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getCustomIconUrl(icon?: string | null) {
  const trimmedIcon = icon?.trim();

  if (!trimmedIcon) return null;
  if (isImageUrl(trimmedIcon)) return buildRoundedImageIconDataUrl(trimmedIcon);

  return buildTextIconDataUrl(trimmedIcon);
}

function upsertManagedIconLink(rel: string, href: string, attributes: Record<string, string> = {}) {
  const marker = `taskflow-${rel.replace(/\s+/g, '-')}`;
  let link = document.querySelector<HTMLLinkElement>(`link[data-taskflow-favicon="${marker}"]`);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    link.dataset.taskflowFavicon = marker;
    document.head.appendChild(link);
  }

  link.href = href;
  link.removeAttribute('type');
  link.removeAttribute('sizes');

  Object.entries(attributes).forEach(([key, value]) => {
    link.setAttribute(key, value);
  });
}

function syncExistingIconLinks(rel: string, href: string, attributes: Record<string, string> = {}) {
  document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`).forEach((link) => {
    link.href = href;
    link.removeAttribute('type');
    link.removeAttribute('sizes');

    Object.entries(attributes).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });
  });
}

function getIconAttributes(iconUrl: string): Record<string, string> {
  if (iconUrl.startsWith('data:image/svg+xml') || iconUrl.endsWith('.svg')) {
    return { type: 'image/svg+xml', sizes: 'any' };
  }

  return {};
}

/**
 * A headless component that synchronizes the Workspace Icon from settings 
 * to the browser's favicon and apple-touch-icon tags.
 * This ensures custom branding appears in tabs and mobile home screens.
 */
export function FaviconSync() {
  useEffect(() => {
    const updateFavicon = () => {
      const config = getUiConfig();
      const customIconUrl = getCustomIconUrl(config?.appIcon);
      const faviconUrl = customIconUrl || DEFAULT_WORKSPACE_ICON_URL;
      const faviconAttributes = getIconAttributes(faviconUrl);

      upsertManagedIconLink(
        'icon',
        faviconUrl,
        faviconAttributes
      );
      upsertManagedIconLink('shortcut icon', faviconUrl);
      upsertManagedIconLink('apple-touch-icon', faviconUrl);
      syncExistingIconLinks('icon', faviconUrl, faviconAttributes);
      syncExistingIconLinks('shortcut icon', faviconUrl);
      syncExistingIconLinks('apple-touch-icon', faviconUrl);

      const originalTitle = document.title;
      document.title = `${originalTitle} `;
      setTimeout(() => {
        document.title = originalTitle;
      }, 50);
    };

    updateFavicon();
    const retryTimers = [100, 500, 1500, 3000].map((delay) => window.setTimeout(updateFavicon, delay));

    // Listen for updates from settings or storage
    window.addEventListener('config-changed', updateFavicon);
    window.addEventListener('company-changed', updateFavicon);
    window.addEventListener('focus', updateFavicon);
    window.addEventListener('pageshow', updateFavicon);
    window.addEventListener('sync-complete', updateFavicon);
    window.addEventListener('taskflow-refresh-finished', updateFavicon);
    window.addEventListener('storage', updateFavicon);
    document.addEventListener('visibilitychange', updateFavicon);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('config-changed', updateFavicon);
      window.removeEventListener('company-changed', updateFavicon);
      window.removeEventListener('focus', updateFavicon);
      window.removeEventListener('pageshow', updateFavicon);
      window.removeEventListener('sync-complete', updateFavicon);
      window.removeEventListener('taskflow-refresh-finished', updateFavicon);
      window.removeEventListener('storage', updateFavicon);
      document.removeEventListener('visibilitychange', updateFavicon);
    };
  }, []);

  return null;
}
