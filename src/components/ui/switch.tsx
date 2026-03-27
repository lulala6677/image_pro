"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:bg-white/20 dark:data-[state=unchecked]:bg-white/10",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:via-yellow-400 data-[state=checked]:to-cyan-400",
        "focus-visible:border-orange-400/50 focus-visible:ring-orange-400/30",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform shadow-sm",
          "bg-white/90 dark:data-[state=unchecked]:bg-white/70",
          "dark:data-[state=checked]:bg-white",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
