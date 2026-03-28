"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[200] flex max-h-screen w-full flex-col items-center gap-3 p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:bottom-0 sm:right-0 sm:top-auto sm:items-stretch sm:flex-col md:max-w-[440px] md:p-5",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden border p-6 pr-8 transition-all duration-300 ease-out will-change-transform data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-right-full data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-4 data-[state=open]:sm:slide-in-from-bottom-3",
  {
    variants: {
      variant: {
        default: "default group border-transparent bg-primary text-primary-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "success group border-transparent bg-green-600 text-white",
        warning: "warning group border-transparent bg-yellow-500 text-black",
        premium: "premium group rounded-[26px] border-white/10 bg-background/88 p-0 shadow-[0_24px_70px_-30px_hsl(var(--foreground)/0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/78",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
        {props.children}
        {props.duration && props.duration < Infinity && (
            <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden bg-white/5">
                <div 
                    className="h-full bg-[linear-gradient(90deg,hsl(var(--primary)/0.16),hsl(var(--primary)/0.5),hsl(var(--primary)/0.16))] animate-timer" 
                    style={{'--toast-duration': `${props.duration / 1000}s`} as React.CSSProperties}
                />
            </div>
        )}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold ring-offset-background transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.default]:border-primary-foreground/40 group-[.default]:hover:bg-primary-foreground/10",
      "group-[.destructive]:border-muted group-[.destructive]:text-destructive-foreground group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      "group-[.success]:border-green-700 group-[.success]:hover:bg-green-700",
      "group-[.warning]:border-yellow-600 group-[.warning]:hover:bg-yellow-600",
      "group-[.premium]:border-white/10 group-[.premium]:bg-white/[0.045] group-[.premium]:text-foreground group-[.premium]:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] group-[.premium]:hover:bg-white/[0.08]",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full border border-white/8 bg-white/[0.04] p-1.5 text-foreground/50 opacity-0 shadow-sm transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
      "group-[.default]:text-primary-foreground/80 group-[.default]:hover:text-primary-foreground group-[.default]:focus:ring-primary-foreground",
      "group-[.destructive]:text-destructive-foreground/80 group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      "group-[.success]:text-green-300 group-[.success]:hover:text-green-50 group-[.success]:focus:ring-green-400 group-[.success]:focus:ring-offset-green-600",
      "group-[.warning]:text-yellow-900 group-[.warning]:hover:text-black group-[.warning]:focus:ring-yellow-400 group-[.warning]:focus:ring-offset-yellow-600",
      "group-[.premium]:right-4 group-[.premium]:top-4 group-[.premium]:border-white/10 group-[.premium]:bg-white/[0.045]",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90 group-[.premium]:opacity-100 group-[.premium]:text-current group-[.premium]:w-full", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
