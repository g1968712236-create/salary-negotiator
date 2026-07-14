import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-8 w-full rounded-md border border-accent/15 bg-black/40 px-2.5 py-1 text-sm text-accent caret-accent shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-accent/20 focus-visible:border-accent/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent/20 focus-visible:outline-offset-1 focus-visible:shadow-[0_0_12px_rgba(0,240,255,0.3),inset_0_0_4px_rgba(0,240,255,0.05)] disabled:cursor-not-allowed disabled:opacity-50 selection:bg-accent/35 selection:text-white"
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "input"
    return (
      <Comp
        type={type}
        className={cn(inputVariants(), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
