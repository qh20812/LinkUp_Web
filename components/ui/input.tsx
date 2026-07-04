"use client";

import { type InputHTMLAttributes, useState } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  leadingIcon?: string;
  error?: string;
}

function Input({
  leadingIcon,
  error,
  className = "",
  id,
  type = "text",
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="space-y-1">
      <div className="relative">
        {leadingIcon && (
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
            style={{ fontSize: 20 }}
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          className={`w-full bg-surface-container-lowest border ${
            error ? "border-error" : "border-outline-variant"
          } rounded-lg py-3 ${leadingIcon ? "pl-10" : "pl-4"} pr-4 text-base transition-all placeholder:text-outline/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(70,72,212,0.15)] focus:outline-none ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}

export default Input;
