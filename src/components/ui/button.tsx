import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

// Simplified button component for Aasaasi learning platform
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Clean base styles focused on learning interactions
    let buttonClasses = "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
    
    // Focused variants for educational platform
    if (variant === "default") {
      buttonClasses += " bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md"
    } else if (variant === "secondary") {
      buttonClasses += " bg-secondary text-secondary-foreground hover:bg-secondary/80"
    } else if (variant === "outline") {
      buttonClasses += " border border-primary/20 bg-background hover:bg-primary/10 hover:border-primary/40"
    } else if (variant === "ghost") {
      buttonClasses += " hover:bg-accent/50 hover:text-accent-foreground"
    }
    
    // Size variations
    if (size === "default") {
      buttonClasses += " h-10 px-4 py-2"
    } else if (size === "sm") {
      buttonClasses += " h-9 px-3 text-xs"
    } else if (size === "lg") {
      buttonClasses += " h-12 px-6 text-base"
    } else if (size === "icon") {
      buttonClasses += " h-10 w-10"
    }
    
    return (
      <Comp
        className={`${buttonClasses} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
