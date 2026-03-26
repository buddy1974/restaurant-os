'use client';
import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { LANGUAGE_NAMES, Locale } from '@/lib/translations';

export default function LanguagePicker() {
  const { locale, setLocale } = useLanguage();
  const locales = Object.keys(LANGUAGE_NAMES) as Locale[];

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {locales.map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
            locale === l
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {LANGUAGE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
