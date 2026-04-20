import React, { useCallback, useEffect, useMemo, useState } from 'react';
import th from '../locales/th.json';
import en from '../locales/en.json';
import LanguageContext from './languageContextValue';

const locales = { th, en };

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'th');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((keyPath) => {
    const keys = keyPath.split('.');
    let value = locales[language];
    
    for (const key of keys) {
      if (value && value[key]) {
        value = value[key];
      } else {
        return keyPath; // Fallback to key path if not found
      }
    }
    
    return value;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
