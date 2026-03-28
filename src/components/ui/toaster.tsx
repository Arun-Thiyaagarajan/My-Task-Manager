"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isPremium = props.variant === 'premium';

        return (
          <Toast key={id} {...props}>
            {!isPremium ? (
                <>
                    <div className="grid gap-1">
                    {title && <ToastTitle>{title}</ToastTitle>}
                    {description && <ToastDescription>{description}</ToastDescription>}
                    </div>
                    {action}
                    <ToastClose />
                </>
            ) : (
                <div className="w-full">
                    {description && <ToastDescription>{description}</ToastDescription>}
                </div>
            )}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
