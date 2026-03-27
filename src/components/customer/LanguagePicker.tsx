'use client';
import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Locale } from '@/lib/translations';

const FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  tr: '🇹🇷',
  fr: '🇫🇷',
  ar: '🇸🇦',
};

export default function LanguagePicker() {
  const { locale, setLocale } = useLanguage();
  const locales = Object.keys(FLAGS) as Locale[];

  return (
    <div className="flex gap-1 flex-wrap">
      {locales.map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`text-xl leading-none p-1 rounded-lg transition-all ${
            locale === l
              ? 'bg-orange-500 shadow-sm scale-110'
              : 'opacity-50 hover:opacity-100'
          }`}
          title={l.toUpperCase()}
        >
          {FLAGS[l]}
        </button>
      ))}
    </div>
  );
}
