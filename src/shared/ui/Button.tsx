import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "active";
  size?: "default" | "icon";
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed group";
    
    const sizeStyles = {
      default: "px-4 h-[34px] text-sm",
      icon: "p-2.5",
    };

    const variantStyles = {
      primary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_oklch(0.62_0.22_25/0.2)]",
      outline: "bg-surface hover:bg-surface-hover text-foreground border border-border shadow-sm",
      active: "bg-primary/20 border border-primary text-primary shadow-[0_0_15px_rgba(229,67,95,0.2)]",
      ghost: "text-muted-foreground hover:text-primary hover:bg-background",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
