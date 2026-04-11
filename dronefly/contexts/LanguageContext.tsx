'use client';

import { createContext, useContext, useState } from 'react';
import { Lang, Translations, getTranslations } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'uk',
  setLang: () => {},
  tr: getTranslations('uk'),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('uk');
  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: getTranslations(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
