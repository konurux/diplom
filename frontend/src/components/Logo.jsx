import React from "react";

export const BRAND_NAME = "PixVault";
export const BRAND_TAGLINE = "Digital Asset & Portfolio Platform";

/**
 * Знак PixVault: скруглённый квадрат («сейф») с сеткой пикселей 2×2.
 * Нижний правый пиксель — лаймовый акцент: «ваша работа внутри хранилища».
 */
export function LogoMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-neutral-900 dark:fill-white" />
      <rect x="8" y="8" width="7" height="7" rx="1.75" className="fill-white dark:fill-neutral-900" />
      <rect x="17" y="8" width="7" height="7" rx="1.75" className="fill-white dark:fill-neutral-900" />
      <rect x="8" y="17" width="7" height="7" rx="1.75" className="fill-white dark:fill-neutral-900" />
      <rect x="17" y="17" width="7" height="7" rx="3.5" fill="hsl(var(--lime))" />
    </svg>
  );
}

export default function Logo({ className = "", markClassName = "w-7 h-7", textClassName = "text-xl", tagline = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight ${textClassName}`}>
          Pix<span className="text-neutral-500 dark:text-neutral-400 font-semibold">Vault</span>
        </span>
        {tagline && (
          <span className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 tracking-normal">
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}
