import { useContext } from 'react';
import LanguageContext from './languageContextValue';

export const useTranslation = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
