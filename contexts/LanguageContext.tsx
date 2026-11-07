"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import viLocale from "../locales/vi.json";
import enLocale from "../locales/en.json";

type Language = "vi" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

/**
 * Bản dịch nạp tĩnh cho cả hai ngôn ngữ.
 *
 * Trước đây locale được nạp bằng dynamic import nên trong vài chục ms đầu
 * `t()` trả lại key thô. Điều đó làm toast thanh toán hiện
 * "packages.paymentFailed" khi cổng thanh toán redirect về (effect chạy ngay
 * khi mount, trước khi import xong). Hai file locale vốn đã nằm trong bundle
 * của app (api/api.ts import tĩnh để dịch error code), nên nạp tĩnh ở đây
 * không phát sinh thêm request; đổi lại không còn khoảng thời gian trả key.
 */
const LOCALES: Record<Language, unknown> = {
  vi: viLocale,
  en: enLocale,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language;
      if (saved === "vi" || saved === "en") return saved;
    }
    return "vi";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const translations = LOCALES[language];

  const t = (key: string, params?: Record<string, string | number>): string => {
    // Key có thể rỗng/undefined khi tra map theo một giá trị enum lạ từ API
    // (TypeScript không bắt được vì Record<K, string> luôn trả string). Trả
    // chuỗi rỗng thay vì ném TypeError làm sập cả cây React.
    if (!key) return "";
    const keys = key.split(".");
    let value: unknown = translations;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (!params) {
      return value;
    }

    return value.replace(/\{(\w+)\}/g, (_, name) => {
      const replacement = params[name];
      return replacement !== undefined ? String(replacement) : `{${name}}`;
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useTranslation must be used within LanguageProvider");
  return context;
};
