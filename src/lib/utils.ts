import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

const AVATAR_COLORS = [
  'f87171', 'fb923c', 'facc15', '4ade80', 
  '2dd4bf', '38bdf8', '818cf8', 'c084fc', 'f472b6'
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
}

const REPO_COLORS = [
  { bg: 'hsl(358 98% 95%)', text: 'hsl(358 78% 50%)', border: 'hsl(358 98% 88%)', darkBg: 'hsl(358 50% 20%)', darkText: 'hsl(358 90% 70%)', darkBorder: 'hsl(358 50% 30%)'},
  { bg: 'hsl(25 95% 95%)', text: 'hsl(25 85% 48%)', border: 'hsl(25 95% 88%)', darkBg: 'hsl(25 50% 20%)', darkText: 'hsl(25 90% 70%)', darkBorder: 'hsl(25 50% 30%)'},
  { bg: 'hsl(45 95% 95%)', text: 'hsl(45 85% 45%)', border: 'hsl(45 95% 88%)', darkBg: 'hsl(45 50% 20%)', darkText: 'hsl(45 90% 70%)', darkBorder: 'hsl(45 50% 30%)'},
  { bg: 'hsl(140 80% 95%)', text: 'hsl(140 60% 35%)', border: 'hsl(140 80% 88%)', darkBg: 'hsl(140 50% 20%)', darkText: 'hsl(140 90% 70%)', darkBorder: 'hsl(140 50% 30%)'},
  { bg: 'hsl(170 80% 95%)', text: 'hsl(170 70% 35%)', border: 'hsl(170 80% 88%)', darkBg: 'hsl(170 50% 20%)', darkText: 'hsl(170 90% 70%)', darkBorder: 'hsl(170 50% 30%)'},
  { bg: 'hsl(200 98% 95%)', text: 'hsl(200 88% 48%)', border: 'hsl(200 98% 88%)', darkBg: 'hsl(200 50% 20%)', darkText: 'hsl(200 90% 70%)', darkBorder: 'hsl(200 50% 30%)'},
  { bg: 'hsl(240 95% 96%)', text: 'hsl(240 75% 55%)', border: 'hsl(240 95% 90%)', darkBg: 'hsl(240 50% 20%)', darkText: 'hsl(240 90% 75%)', darkBorder: 'hsl(240 50% 30%)'},
  { bg: 'hsl(270 95% 96%)', text: 'hsl(270 70% 55%)', border: 'hsl(270 95% 90%)', darkBg: 'hsl(270 50% 20%)', darkText: 'hsl(270 90% 75%)', darkBorder: 'hsl(270 50% 30%)'},
  { bg: 'hsl(330 95% 96%)', text: 'hsl(330 80% 55%)', border: 'hsl(330 95% 90%)', darkBg: 'hsl(330 50% 20%)', darkText: 'hsl(330 90% 75%)', darkBorder: 'hsl(330 50% 30%)'},
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
