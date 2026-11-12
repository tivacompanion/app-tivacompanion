import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.chat': 'Ask Tiva',
    'nav.medications': 'Medications',
    'nav.health': 'Health',
    'nav.vault': 'Records',
    'nav.wellness': 'Wellness',
    'nav.family': 'Family',
    'nav.emergency': 'Emergency',
    'nav.caregiver': 'Caregiver',
    'nav.profile': 'Profile',
    'nav.subscription': 'Subscription',
    'common.add': 'Add',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'good_morning': 'Good morning',
    'good_afternoon': 'Good afternoon',
    'good_evening': 'Good evening',
    'vitals_stable': 'Your vitals are stable today',
    'medications_due': 'medications due',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.chat': 'Demander à Tiva',
    'nav.medications': 'Médicaments',
    'nav.health': 'Santé',
    'nav.vault': 'Dossiers',
    'nav.wellness': 'Bien-être',
    'nav.family': 'Famille',
    'nav.emergency': 'Urgence',
    'nav.caregiver': 'Soignant',
    'nav.profile': 'Profil',
    'nav.subscription': 'Abonnement',
    'common.add': 'Ajouter',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'good_morning': 'Bonjour',
    'good_afternoon': 'Bon après-midi',
    'good_evening': 'Bonsoir',
    'vitals_stable': 'Vos signes vitaux sont stables aujourd\'hui',
    'medications_due': 'médicaments à prendre',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('tiva_language');
    if (saved) setLanguageState(saved);
  }, []);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('tiva_language', lang);
  };

  const t = (key) => translations[language][key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}