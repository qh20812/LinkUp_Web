import type { LabelHTMLAttributes, ReactNode } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

function Label({ children, required, className = "", ...props }: LabelProps) {
  return (
    <label
      className={`font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant block ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-1">*</span>}
    </label>
  );
}

export default Label;
