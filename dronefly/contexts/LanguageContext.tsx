'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Lang, Translations, getTranslations } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Translations;
}

const STORAGE_KEY = 'dronefly.lang';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'uk',
  setLang: () => {},
  tr: getTranslations('uk'),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with 'uk' to match the server render, then restore the saved choice.
  const [lang, setLangState] = useState<Lang>('uk');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Restoring after hydration is intentional: reading storage during render would mismatch the static HTML.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'uk' || saved === 'en') setLangState(saved);
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: getTranslations(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
