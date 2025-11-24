

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"
import { format, isToday, isYesterday } from "date-fns"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) {
    return "";
  }
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
}

export function getAvatarColor(name: string): string {
  if (!name) return 'cccccc'; // Return a default grey if name is empty
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // to 32bit int
  }
  
  const h = Math.abs(hash % 360) / 360; // hue
  const s = 0.65; // saturation
  const l = 0.5; // lightness for good contrast with white text
  
  const [r, g, b] = hslToRgb(h, s, l);
  
  return rgbToHex(r, g, b);
}

const REPO_COLORS = [
  { bg: 'hsl(215 40% 95%)', text: 'hsl(215 60% 45%)', border: 'hsl(215 40% 88%)', darkBg: 'hsl(215 30% 20%)', darkText: 'hsl(215 60% 75%)', darkBorder: 'hsl(215 30% 30%)'},
  { bg: 'hsl(25 95% 95%)', text: 'hsl(25 85% 48%)', border: 'hsl(25 95% 88%)', darkBg: 'hsl(25 50% 20%)', darkText: 'hsl(25 90% 70%)', darkBorder: 'hsl(25 50% 30%)'},
  { bg: 'hsl(45 95% 95%)', text: 'hsl(45 85% 45%)', border: 'hsl(45 95% 88%)', darkBg: 'hsl(45 50% 20%)', darkText: 'hsl(45 90% 70%)', darkBorder: 'hsl(45 50% 30%)'},
  { bg: 'hsl(140 80% 95%)', text: 'hsl(140 60% 35%)', border: 'hsl(140 80% 88%)', darkBg: 'hsl(140 50% 20%)', darkText: 'hsl(140 90% 70%)', darkBorder: 'hsl(140 50% 30%)'},
  { bg: 'hsl(170 80% 95%)', text: 'hsl(170 70% 35%)', border: 'hsl(170 80% 88%)', darkBg: 'hsl(170 50% 20%)', darkText: 'hsl(170 90% 70%)', darkBorder: 'hsl(170 50% 30%)'},
  { bg: 'hsl(200 98% 95%)', text: 'hsl(200 88% 48%)', border: 'hsl(200 98% 88%)', darkBg: 'hsl(200 50% 20%)', darkText: 'hsl(200 90% 70%)', darkBorder: 'hsl(200 50% 30%)'},
  { bg: 'hsl(240 95% 96%)', text: 'hsl(240 75% 55%)', border: 'hsl(240 95% 90%)', darkBg: 'hsl(240 50% 20%)', darkText: 'hsl(240 90% 75%)', darkBorder: 'hsl(240 50% 30%)'},
  { bg: 'hsl(270 95% 96%)', text: 'hsl(270 70% 55%)', border: 'hsl(270 95% 90%)', darkBg: 'hsl(270 50% 20%)', darkText: 'hsl(270 90% 75%)', darkBorder: 'hsl(270 50% 30%)'},
  { bg: 'hsl(358 98% 95%)', text: 'hsl(358 78% 50%)', border: 'hsl(358 98% 88%)', darkBg: 'hsl(358 50% 20%)', darkText: 'hsl(358 90% 70%)', darkBorder: 'hsl(358 50% 30%)'},
];

export function getRepoBadgeStyle(name: string): CSSProperties {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % REPO_COLORS.length);
  const colors = REPO_COLORS[index];
  
  return {
    '--repo-bg': colors.bg,
    '--repo-text': colors.text,
    '--repo-border': colors.border,
    '--dark-repo-bg': colors.darkBg,
    '--dark-repo-text': colors.darkText,
    '--dark-repo-border': colors.darkBorder,
  } as CSSProperties;
}


/**
 * A simple fuzzy search function that checks if characters from the query appear in the text in order.
 * @param query The search query string.
 * @param text The text to search within.
 * @returns `true` if the text is a fuzzy match for the query, `false` otherwise.
 */
export function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true; // if query is empty, it's a match
  if (!text) return false;

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  let queryIndex = 0;
  let textIndex = 0;

  while (queryIndex < lowerQuery.length && textIndex < lowerText.length) {
    if (lowerQuery[queryIndex] === lowerText[textIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === lowerQuery.length;
}

/**
 * Formats a timestamp into a human-readable string.
 * - If the date is today, it shows "Today" and the time (e.g., "Today 1:23 PM").
 * - If the date was yesterday, it shows "Yesterday" and the time (e.g., "Yesterday 3:08 PM").
 * - Otherwise, it shows the full date and time (e.g., "Mar 6, 2024 1:23 PM").
 * @param date The date to format.
 * @param timeFormat The desired time format ('12h' or '24h').
 * @returns A formatted date string.
 */
export function formatTimestamp(date: string | Date, timeFormat: '12h' | '24h' = '12h'): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';

    const timeString = format(d, timeFormat === '24h' ? 'HH:mm' : 'p');

    if (isToday(d)) {
        return `Today ${timeString}`;
    }
    if (isYesterday(d)) {
        return `Yesterday ${timeString}`;
    }
    return format(d, timeFormat === '24h' ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy p');
}

export function getEnvInfo(envName: string, isDeployed: boolean) {
    let hash = 0;
    for (let i = 0; i < envName.length; i++) {
        hash = envName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);

    const deployedClasses = `bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80 dark:hover:bg-green-900/60`;
    const pendingClasses = `bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80 dark:hover:bg-yellow-900/60`;

    return {
        isDeployed,
        badgeClasses: isDeployed ? deployedClasses : pendingClasses,
        colorStyle: {
            backgroundColor: isDeployed ? `hsla(${hue}, 60%, 95%, 1)`: 'transparent',
            color: `hsla(${hue}, 80%, 30%, 1)`,
            borderColor: `hsla(${hue}, 60%, 88%, 1)`,
        } as CSSProperties
    };
}
