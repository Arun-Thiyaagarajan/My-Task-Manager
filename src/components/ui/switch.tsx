"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#6f6f78] p-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.25)] transition-[background-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_10px_24px_-16px_hsl(var(--primary)/0.95)] data-[state=unchecked]:bg-[#6f6f78]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-7 w-7 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.22),0_7px_16px_-8px_rgba(0,0,0,0.4)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform data-[state=checked]:translate-x-[1.25rem] data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
