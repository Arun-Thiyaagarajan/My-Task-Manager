"use client"

import type { ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, BellRing, TriangleAlert, Info, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const toastThemeMap = {
  default: {
    icon: BellRing,
    shellClassName: "border-l-sky-400/75 before:from-sky-400/12 before:via-sky-400/4 before:to-transparent after:from-sky-400/30",
    iconWrapClassName: "bg-sky-50/95 text-sky-700 ring-1 ring-sky-200/80 shadow-[0_10px_24px_-18px_rgba(14,165,233,0.22)] dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/18 dark:shadow-[0_12px_28px_-22px_rgba(56,189,248,0.38)]",
    eyebrow: "Notice",
  },
  success: {
    icon: CheckCircle2,
    shellClassName: "border-l-emerald-400/80 before:from-emerald-400/12 before:via-emerald-400/4 before:to-transparent after:from-emerald-400/35",
    iconWrapClassName: "bg-emerald-50/95 text-emerald-700 ring-1 ring-emerald-200/80 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.22)] dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/18 dark:shadow-[0_12px_28px_-22px_rgba(16,185,129,0.38)]",
    eyebrow: "Success",
  },
  destructive: {
    icon: AlertCircle,
    shellClassName: "border-l-rose-400/80 before:from-rose-400/12 before:via-rose-400/4 before:to-transparent after:from-rose-400/35",
    iconWrapClassName: "bg-rose-50/95 text-rose-700 ring-1 ring-rose-200/80 shadow-[0_10px_24px_-18px_rgba(244,63,94,0.22)] dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/18 dark:shadow-[0_12px_28px_-22px_rgba(244,63,94,0.4)]",
    eyebrow: "Error",
  },
  warning: {
    icon: TriangleAlert,
    shellClassName: "border-l-amber-300/85 before:from-amber-300/14 before:via-amber-300/5 before:to-transparent after:from-amber-300/35",
    iconWrapClassName: "bg-amber-50/95 text-amber-700 ring-1 ring-amber-200/80 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.2)] dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/18 dark:shadow-[0_12px_28px_-22px_rgba(251,191,36,0.35)]",
    eyebrow: "Warning",
  },
  premium: {
    icon: Info,
    shellClassName: "border-l-primary/85 before:from-primary/16 before:via-primary/6 before:to-transparent after:from-primary/40",
    iconWrapClassName: "bg-primary/10 text-primary ring-1 ring-primary/15 shadow-[0_10px_24px_-18px_hsl(var(--primary)/0.2)] dark:bg-primary/12 dark:text-primary dark:ring-primary/20 dark:shadow-[0_12px_28px_-22px_hsl(var(--primary)/0.36)]",
    eyebrow: "Update",
  },
} as const

function getToastTone({
  variant,
  title,
  description,
}: {
  variant?: keyof typeof toastThemeMap
  title?: ReactNode
  description?: ReactNode
}) {
  const text = `${typeof title === "string" ? title : ""} ${typeof description === "string" ? description : ""}`.toLowerCase()
  const isBinToast =
    text.includes("bin") ||
    text.includes("trash") ||
    text.includes("deleted") ||
    text.includes("delete forever") ||
    text.includes("permanently deleted")

  if (isBinToast) {
    return {
      ...toastThemeMap.warning,
      icon: Trash2,
      eyebrow: "Bin",
    }
  }

  return toastThemeMap[variant || "default"]
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant || 'default';
        const tone = getToastTone({ variant, title, description });
        const Icon = tone.icon;

        return (
          <Toast
            key={id}
            {...props}
            variant="premium"
            className={cn(
              "mx-auto w-auto min-w-[min(270px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border-l-[3px] before:absolute before:inset-x-0 before:top-0 before:h-14 before:pointer-events-none before:rounded-t-2xl before:bg-gradient-to-b before:content-['']",
              "after:pointer-events-none after:absolute after:inset-y-4 after:left-0 after:w-px after:bg-gradient-to-b after:via-current/10 after:to-transparent after:content-['']",
              "bg-[linear-gradient(180deg,hsl(var(--background)/0.98)_0%,hsl(var(--card)/0.96)_100%)] shadow-[0_18px_44px_-26px_hsl(var(--foreground)/0.38)]",
              "sm:mx-0 sm:w-full sm:min-w-0 sm:max-w-none sm:rounded-[26px] sm:border-l-[4px] sm:before:h-20 sm:before:rounded-t-[26px] sm:after:inset-y-5 sm:shadow-[0_30px_90px_-38px_hsl(var(--foreground)/0.58)]",
              tone.shellClassName
            )}
          >
            <div className="w-full px-3.5 py-3 sm:p-[18px]">
              <div className="flex items-center gap-2.5 sm:items-start sm:gap-3.5">
                <div className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-black/5 dark:border-white/8 sm:h-12 sm:w-12 sm:rounded-[20px]", tone.iconWrapClassName)}>
                  <div className="absolute inset-[1px] rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.5))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] sm:rounded-[19px]" />
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_60%)] sm:rounded-[20px]" />
                  <Icon className="relative h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 pr-1 sm:space-y-1.5 sm:pr-8 sm:pt-0.5">
                  <p className="hidden text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground/60 sm:block">
                    {tone.eyebrow}
                  </p>
                  {title && <ToastTitle className="text-[13.5px] font-semibold tracking-[-0.02em] text-foreground sm:text-[15.5px] sm:tracking-[-0.025em]">{title}</ToastTitle>}
                  {description && (
                    <ToastDescription className="text-[12px] leading-[1.45] text-muted-foreground/90 sm:text-[13px] sm:leading-[1.55] sm:text-muted-foreground/95">
                      {description}
                    </ToastDescription>
                  )}
                  {action && <div className="hidden pt-1 sm:block">{action}</div>}
                </div>
              </div>
            </div>
            <ToastClose className="hidden sm:flex" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
