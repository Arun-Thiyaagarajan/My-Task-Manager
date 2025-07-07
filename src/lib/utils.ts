
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"

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

const ENV_COLORS = [
  { deployed: 'border-transparent bg-purple-600 text-purple-50 dark:bg-purple-700 dark:text-purple-100', pending: 'border-dashed border-purple-500/80 text-purple-600 dark:border-purple-500/70 dark:text-purple-400 bg-transparent' },
  { deployed: 'border-transparent bg-pink-600 text-pink-50 dark:bg-pink-700 dark:text-pink-100', pending: 'border-dashed border-pink-500/80 text-pink-600 dark:border-pink-500/70 dark:text-pink-400 bg-transparent' },
  { deployed: 'border-transparent bg-teal-600 text-teal-50 dark:bg-teal-700 dark:text-teal-100', pending: 'border-dashed border-teal-500/80 text-teal-600 dark:border-teal-500/70 dark:text-teal-400 bg-transparent' },
  { deployed: 'border-transparent bg-indigo-600 text-indigo-50 dark:bg-indigo-700 dark:text-indigo-100', pending: 'border-dashed border-indigo-500/80 text-indigo-600 dark:border-indigo-500/70 dark:text-indigo-400 bg-transparent' },
  { deployed: 'border-transparent bg-cyan-600 text-cyan-50 dark:bg-cyan-700 dark:text-cyan-100', pending: 'border-dashed border-cyan-500/80 text-cyan-600 dark:border-cyan-500/70 dark:text-cyan-400 bg-transparent' },
  { deployed: 'border-transparent bg-rose-600 text-rose-50 dark:bg-rose-700 dark:text-rose-100', pending: 'border-dashed border-rose-500/80 text-rose-600 dark:border-rose-500/70 dark:text-rose-400 bg-transparent' },
  { deployed: 'border-transparent bg-sky-600 text-sky-50 dark:bg-sky-700 dark:text-sky-100', pending: 'border-dashed border-sky-500/80 text-sky-600 dark:border-sky-500/70 dark:text-sky-400 bg-transparent' },
];

export const getEnvInfo = (env: string) => {
  switch (env.toLowerCase()) {
    case 'dev':
    case 'develop':
      return {
        deployedColor: 'border-transparent bg-blue-600 text-blue-50 dark:bg-blue-700 dark:text-blue-100',
        pendingColor: 'border-dashed border-blue-500/80 text-blue-600 dark:border-blue-500/70 dark:text-blue-400 bg-transparent',
        label: 'Development',
      };
    case 'stage':
      return {
        deployedColor: 'border-transparent bg-amber-500 text-white dark:bg-amber-600 dark:text-amber-50',
        pendingColor: 'border-dashed border-amber-500/80 text-amber-600 dark:border-amber-500/70 dark:text-amber-400 bg-transparent',
        label: 'Staging',
      };
    case 'production':
      return {
        deployedColor: 'border-transparent bg-green-600 text-green-50 dark:bg-green-700 dark:text-green-100',
        pendingColor: 'border-dashed border-green-500/80 text-green-600 dark:border-green-500/70 dark:text-green-400 bg-transparent',
        label: 'Production',
      };
    default:
      let hash = 0;
      for (let i = 0; i < env.length; i++) {
        hash = env.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash % ENV_COLORS.length);
      const colors = ENV_COLORS[index];
      return {
        deployedColor: colors.deployed,
        pendingColor: colors.pending,
        label: env,
      };
  }
};

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
