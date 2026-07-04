"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  leadingIcon?: string;
  trailingIcon?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-bold leading-normal transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary:
      "bg-primary text-on-primary shadow-md shadow-primary/20 hover:translate-y-[-1px]",
    outline:
      "bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-container-highest",
    ghost: "text-primary hover:bg-primary/5",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {leadingIcon && (
        <span className="material-symbols-outlined text-[18px]">{leadingIcon}</span>
      )}
      {children}
      {trailingIcon && (
        <span className="material-symbols-outlined text-[18px]">{trailingIcon}</span>
      )}
    </button>
  );
}

export default Button;
