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
              "mx-auto w-auto min-w-[min(248px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-[20px] border-l-[3px] before:absolute before:inset-x-0 before:top-0 before:h-11 before:pointer-events-none before:rounded-t-[20px] before:bg-gradient-to-b before:content-['']",
              "after:pointer-events-none after:absolute after:inset-y-3.5 after:left-0 after:w-px after:bg-gradient-to-b after:via-current/10 after:to-transparent after:content-['']",
              "bg-[linear-gradient(180deg,hsl(var(--background)/0.985)_0%,hsl(var(--card)/0.97)_100%)] shadow-[0_16px_36px_-24px_hsl(var(--foreground)/0.24)]",
              "sm:mx-0 sm:w-full sm:min-w-0 sm:max-w-none sm:rounded-[22px] sm:border-l-[4px] sm:before:h-14 sm:before:rounded-t-[22px] sm:after:inset-y-4 sm:shadow-[0_24px_60px_-34px_hsl(var(--foreground)/0.4)]",
              tone.shellClassName
            )}
          >
            <div className="w-full px-3 py-2.5 sm:px-4 sm:py-3.5">
              <div className="flex items-center gap-2.5 sm:items-start sm:gap-3">
                <div className={cn("relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[16px] border border-black/5 dark:border-white/8 sm:h-10 sm:w-10 sm:rounded-[18px]", tone.iconWrapClassName)}>
                  <div className="absolute inset-[1px] rounded-[13px] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.5))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] sm:rounded-[17px]" />
                  <div className="absolute inset-0 rounded-[16px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_60%)] sm:rounded-[18px]" />
                  <Icon className="relative h-[15px] w-[15px] sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 pr-0.5 sm:space-y-1 sm:pr-7 sm:pt-0.5">
                  <p className="hidden text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/55 sm:block">
                    {tone.eyebrow}
                  </p>
                  {title && <ToastTitle className="text-[12.5px] font-semibold tracking-[-0.018em] text-foreground sm:text-[14px] sm:tracking-[-0.022em]">{title}</ToastTitle>}
                  {description && (
                    <ToastDescription className="text-[11px] leading-[1.4] text-muted-foreground/88 sm:text-[12px] sm:leading-[1.48] sm:text-muted-foreground/92">
                      {description}
                    </ToastDescription>
                  )}
                  {action && <div className="hidden pt-0.5 sm:block">{action}</div>}
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
