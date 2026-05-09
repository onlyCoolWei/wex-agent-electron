import { useCallback } from 'react';
import { enUS } from './locales/en-US';
import { zhCN } from './locales/zh-CN';
import type { LocaleDictionary } from './locales/zh-CN';
import { languages, useLanguageStore, type Language } from './useLanguageStore';

const dictionaries: Record<Language, LocaleDictionary> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

type Primitive = string | number | boolean | null | undefined;
type TranslationParams = Record<string, Primitive>;

type DotPath<T> = {
  [Key in keyof T & string]: T[Key] extends string ? Key : `${Key}.${DotPath<T[Key]>}`;
}[keyof T & string];

export type TranslationKey = DotPath<LocaleDictionary>;

function getTranslation(dictionary: LocaleDictionary, key: TranslationKey) {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, dictionary);
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''));
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const translation = getTranslation(dictionaries[language], key);

      if (typeof translation !== 'string') {
        return key;
      }

      return interpolate(translation, params);
    },
    [language],
  );

  return { language, t };
}

export { dictionaries, languages, useLanguageStore };
export type { Language };
