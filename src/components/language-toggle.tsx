import { Button } from '@/components/ui/button';
import { languages, useLanguageStore, useTranslation, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const languageLabelKeys: Record<Language, 'language.zhCN' | 'language.enUS'> = {
  'zh-CN': 'language.zhCN',
  'en-US': 'language.enUS',
};

export function LanguageToggle() {
  const { language, t } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <div
      aria-label={t('language.toggleLabel')}
      className="app-no-drag bg-muted border-border inline-flex rounded-xl border p-1"
      role="group"
    >
      {languages.map((item) => (
        <Button
          aria-pressed={item === language}
          className={cn('h-7 rounded-lg px-2.5 text-xs', item === language && 'bg-brand text-primary-foreground')}
          key={item}
          size="xs"
          type="button"
          variant={item === language ? 'default' : 'ghost'}
          onClick={() => setLanguage(item)}
        >
          {t(languageLabelKeys[item])}
        </Button>
      ))}
    </div>
  );
}
