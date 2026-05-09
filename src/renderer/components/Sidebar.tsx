import { useEffect, useRef, useState } from 'react';
import { ChevronRight, FolderOpen, Languages, Monitor, Moon, Plus, Settings, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SelectOption } from '@/components/ui/select';
import { languages, useLanguageStore, useTranslation, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ProjectItem } from '../types';

type SidebarProps = {
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  status: string;
  onAddProject: () => void;
  onActivateProject: (project: ProjectItem) => void;
};

type SettingsPanel = 'theme' | 'language' | null;

const themeOptions: {
  value: Theme;
  labelKey: 'settings.theme.light' | 'settings.theme.dark' | 'settings.theme.system';
  Icon: LucideIcon;
}[] = [
  { value: 'light', labelKey: 'settings.theme.light', Icon: Sun },
  { value: 'dark', labelKey: 'settings.theme.dark', Icon: Moon },
  { value: 'system', labelKey: 'settings.theme.system', Icon: Monitor },
];

const languageLabelKeys: Record<Language, 'settings.language.zhCN' | 'settings.language.enUS'> = {
  'zh-CN': 'settings.language.zhCN',
  'en-US': 'settings.language.enUS',
};

export function Sidebar({ projects, activeProject, status, onAddProject, onActivateProject }: SidebarProps) {
  const { language, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSettingsOpen) return undefined;

    function handlePointerDown(event: PointerEvent) {
      if (settingsRef.current?.contains(event.target as Node)) return;
      setIsSettingsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  return (
    <aside className="bg-sidebar flex w-72 shrink-0 flex-col" aria-label={t('sidebar.ariaLabel')}>
      <Card
        className={cn(
          'border-border bg-card border',
          'bg-sidebar text-sidebar-foreground flex-1 gap-5 rounded-none border-0 p-4 shadow-none',
        )}
      >
        <div
          className="app-drag flex h-8 items-center justify-start gap-2 pl-[68px]"
          aria-label={t('sidebar.toolbarLabel')}
        >
          {/* 原生红黄绿由主进程通过 trafficLightPosition 叠在此区域左侧；这里继续追加按钮即可 */}
        </div>

        <div className="flex gap-2">
          <Button
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-1 justify-start rounded-xl"
            type="button"
            variant="ghost"
            onClick={onAddProject}
          >
            <Plus className="size-4" />
            {t('sidebar.addProject')}
          </Button>
        </div>

        <section className="grid min-h-0 gap-3" aria-label={t('sidebar.projects')}>
          <div className="text-bodySmall text-muted-foreground flex items-baseline justify-between tracking-widest">
            <span className="uppercase">{t('sidebar.projects')}</span>
          </div>
          <div className="grid gap-2 overflow-auto">
            {projects.map((project) => (
              <Button
                className={cn(
                  'text-sidebar-foreground h-auto w-full justify-start gap-2 rounded-2xl border border-transparent bg-transparent p-2.5 text-left',
                  'hover:border-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  project.id === activeProject?.id &&
                    'border-sidebar-ring bg-sidebar-accent text-sidebar-accent-foreground',
                )}
                key={project.id}
                type="button"
                variant="ghost"
                onClick={() => onActivateProject(project)}
              >
                <span className="bg-secondary text-brand inline-flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <FolderOpen className="size-4" />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <strong className="text-bodyMedium block overflow-hidden leading-snug text-ellipsis whitespace-nowrap">
                    {project.name}
                  </strong>
                  <small className="text-bodySmall text-muted-foreground block overflow-hidden text-ellipsis whitespace-nowrap">
                    {project.path}
                  </small>
                </span>
              </Button>
            ))}
          </div>
        </section>

        <div className="mt-auto grid gap-3">
          <div className="bg-muted border-border grid gap-1.5 rounded-2xl border p-4">
            <span className="text-bodySmall text-brand font-black tracking-widest uppercase">
              {t('sidebar.status')}
            </span>
            <strong className="text-bodySmall text-foreground leading-relaxed">{status}</strong>
          </div>

          <div className="app-no-drag relative" ref={settingsRef}>
            {isSettingsOpen && (
              <div
                className="border-border bg-popover text-popover-foreground absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-56 rounded-2xl border p-2 shadow-xl"
                role="menu"
              >
                <Button
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground h-10 w-full justify-start gap-3 rounded-xl px-2.5 text-left',
                    activeSettingsPanel === 'theme'
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-popover-foreground',
                  )}
                  type="button"
                  role="menuitem"
                  variant="ghost"
                  onFocus={() => setActiveSettingsPanel('theme')}
                  onMouseEnter={() => setActiveSettingsPanel('theme')}
                >
                  <Settings className="size-4" />
                  <span className="text-bodyMedium flex-1">{t('settings.theme.label')}</span>
                  <ChevronRight className="size-4 opacity-70" />
                </Button>

                <Button
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground h-10 w-full justify-start gap-3 rounded-xl px-2.5 text-left',
                    activeSettingsPanel === 'language'
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-popover-foreground',
                  )}
                  type="button"
                  role="menuitem"
                  variant="ghost"
                  onFocus={() => setActiveSettingsPanel('language')}
                  onMouseEnter={() => setActiveSettingsPanel('language')}
                >
                  <Languages className="size-4" />
                  <span className="text-bodyMedium flex-1">{t('settings.language.label')}</span>
                  <ChevronRight className="size-4 opacity-70" />
                </Button>

                {activeSettingsPanel && (
                  <div
                    className={cn(
                      'border-border bg-popover absolute left-[calc(100%+0.5rem)] z-30 w-48 rounded-2xl border p-2 shadow-xl',
                      activeSettingsPanel === 'theme' ? 'top-0' : 'top-11',
                    )}
                    role="listbox"
                    aria-label={
                      activeSettingsPanel === 'theme' ? t('settings.theme.label') : t('settings.language.label')
                    }
                  >
                    {activeSettingsPanel === 'theme'
                      ? themeOptions.map(({ value, labelKey, Icon }) => (
                          <SelectOption
                            className="h-10 rounded-xl"
                            key={value}
                            selected={theme === value}
                            onClick={() => {
                              setTheme(value);
                              setIsSettingsOpen(false);
                            }}
                          >
                            <Icon className="size-4" />
                            {t(labelKey)}
                          </SelectOption>
                        ))
                      : languages.map((item) => (
                          <SelectOption
                            className="h-10 rounded-xl"
                            key={item}
                            selected={language === item}
                            onClick={() => {
                              setLanguage(item);
                              setIsSettingsOpen(false);
                            }}
                          >
                            <span className="bg-secondary text-brand inline-flex size-6 items-center justify-center rounded-lg text-xs font-bold">
                              {item === 'zh-CN' ? '中' : 'EN'}
                            </span>
                            {t(languageLabelKeys[item])}
                          </SelectOption>
                        ))}
                  </div>
                )}
              </div>
            )}

            <Button
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-11 w-full justify-start rounded-2xl"
              type="button"
              variant="ghost"
              aria-expanded={isSettingsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setActiveSettingsPanel(null);
                setIsSettingsOpen((open) => !open);
              }}
            >
              <Settings className="size-5" />
              {t('settings.label')}
            </Button>
          </div>
        </div>
      </Card>
    </aside>
  );
}
