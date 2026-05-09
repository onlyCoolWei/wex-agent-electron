import { FormEvent, RefObject } from 'react';
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
    'max-w-3xl rounded-3xl border border-border bg-card px-4 py-4',
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
          <h1 className="text-headlineSmall text-foreground mb-1.5 max-w-none leading-tight tracking-tight">
            {activeProject?.name ?? t('content.emptyProjectTitle')}
          </h1>
          <p className="text-bodySmall text-muted-foreground block overflow-hidden text-ellipsis whitespace-nowrap">
            {activeProject?.path ?? t('content.emptyProjectPath')}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClear}>
          {t('content.clearSession')}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto p-7" ref={scrollRef}>
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

      <form className="border-border bg-muted flex gap-3 border-t p-4" onSubmit={onSubmit}>
        <Textarea
          className="bg-background text-bodyMedium text-foreground focus-visible:border-ring focus-visible:ring-ring max-h-48 min-h-24 flex-1 resize-y rounded-xl p-3.5"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={
            activeProject ? t('content.promptActive', { name: activeProject.name }) : t('content.promptEmpty')
          }
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button className="min-h-24 w-28 rounded-xl font-black" disabled={isRunning || !prompt.trim()} type="submit">
          {isRunning ? t('content.running') : t('content.send')}
        </Button>
      </form>
    </Card>
  );
}
