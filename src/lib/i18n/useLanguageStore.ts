import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const languages = ['zh-CN', 'en-US'] as const;

export type Language = (typeof languages)[number];

type LanguageState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'wex-agent-language',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
