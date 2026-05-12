import { FormEvent, RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ChatItem, ProjectItem } from '../types';

const roleLabelKeys = {
  user: 'app.roles.user',
  assistant: 'app.roles.assistant',
  tool: 'app.roles.tool',
  system: 'app.roles.system',
} as const;

type ContentAreaProps = {
  activeProject: ProjectItem | null;
  items: ChatItem[];
  prompt: string;
  isRunning: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onPromptChange: (prompt: string) => void;
  onClear: () => void;
  onSubmit: (event: FormEvent) => void;
};

function getBubbleClassName(item: ChatItem) {
  return cn(
    'max-w-3xl rounded-3xl bg-card px-2 py-4',
    'text-bodyMedium',
    item.role === 'user' && 'self-end border-brand bg-accent text-accent-foreground',
    item.role === 'assistant' && 'self-start bg-card',
    (item.role === 'tool' || item.role === 'system') && 'max-w-full rounded-2xl bg-muted',
    item.tone === 'error' && 'border-destructive bg-destructive text-destructive-foreground',
    item.tone === 'muted' && 'text-muted-foreground',
  );
}

export function ContentArea({
  activeProject,
  items,
  prompt,
  isRunning,
  scrollRef,
  onPromptChange,
  onClear,
  onSubmit,
}: ContentAreaProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-card flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-l-xl rounded-r-none border border-none p-0">
      <header className="app-drag flex items-center gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-bodySmall text-brand mb-1.5 font-extrabold tracking-widest uppercase">{t('app.brand')}</p>
          <p className="text-bodySmall text-muted-foreground block overflow-hidden text-ellipsis whitespace-nowrap">
            {activeProject?.path ?? t('content.emptyProjectPath')}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClear}>
          {t('content.clearSession')}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-7" ref={scrollRef}>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3.5">
          {items.map((item) => (
            <article className={getBubbleClassName(item)} key={item.id}>
              <Badge
                className="text-bodySmall text-secondary-foreground mb-2 font-black tracking-widest uppercase"
                variant={item.tone === 'error' ? 'destructive' : 'secondary'}
              >
                {t(roleLabelKeys[item.role])}
              </Badge>
              <p className="m-0 leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {item.text || (item.role === 'assistant' ? t('content.assistantPending') : '')}
              </p>
            </article>
          ))}
        </div>
      </div>

      <form className="bg-card px-5 pb-5" onSubmit={onSubmit}>
        <div className="bg-popover ring-border/80 focus-within:ring-ring/70 mx-auto flex min-h-28 w-full max-w-4xl flex-col rounded-xl p-4 shadow-2xl ring-1 transition-[box-shadow,ring-color] focus-within:shadow-xl focus-within:ring-2">
          <Textarea
            className="text-bodyMedium text-foreground placeholder:text-text-placeholder max-h-48 min-h-14 flex-1 resize-none border-0 bg-transparent px-0 pt-0 pb-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder={
              activeProject ? t('content.promptActive', { name: activeProject.name }) : t('content.promptEmpty')
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex items-end justify-end">
            <Button
              aria-label={isRunning ? t('content.running') : t('content.send')}
              className="bg-foreground text-background hover:bg-foreground/90 size-11 rounded-full shadow-lg transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-35"
              disabled={isRunning || !prompt.trim()}
              size="icon"
              type="submit"
            >
              <ArrowUp className="size-5 stroke-[2.5]" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
