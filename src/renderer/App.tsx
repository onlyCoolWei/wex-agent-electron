import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { AgentEvent } from '../shared/ipc';
import { ContentArea } from './components/ContentArea';
import { Sidebar } from './components/Sidebar';
import type { ChatItem, ProjectItem } from './types';

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function getProjectName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function formatToolInput(input: Record<string, unknown>) {
  const text = JSON.stringify(input);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

export function App() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(() => t('app.status.ready'));
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([
    {
      id: createId(),
      role: 'system',
      text: t('app.messages.ready'),
      tone: 'muted',
    },
  ]);

  const activeAssistantId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

  const appendItem = useCallback((item: ChatItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const appendAssistantText = useCallback((text: string) => {
    const id = activeAssistantId.current;
    if (!id) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text: `${item.text}${text}` } : item)));
  }, []);

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      if (event.type === 'turn') {
        setStatus(t('app.status.thinking', { turn: event.turn }));
        return;
      }
      if (event.type === 'text') {
        appendAssistantText(event.text);
        return;
      }
      if (event.type === 'tool_start') {
        appendItem({
          id: createId(),
          role: 'tool',
          text: t('app.messages.runningTool', { name: event.name, input: formatToolInput(event.input) }),
          tone: 'muted',
        });
        return;
      }
      if (event.type === 'tool_result') {
        appendItem({
          id: createId(),
          role: 'tool',
          text: `${event.name}: ${event.result.content.slice(0, 360)}`,
          tone: event.result.isError ? 'error' : 'muted',
        });
        return;
      }
      if (event.type === 'error') {
        setStatus(t('app.status.error'));
        appendItem({
          id: createId(),
          role: 'system',
          text: event.message,
          tone: 'error',
        });
        return;
      }
      if (event.type === 'done') {
        setStatus(
          t('app.status.done', {
            reason: event.result.reason,
            turns: event.result.state.turnCount,
            inputTokens: event.result.state.totalInputTokens,
            outputTokens: event.result.state.totalOutputTokens,
          }),
        );
        setIsRunning(false);
        activeAssistantId.current = null;
      }
    },
    [appendAssistantText, appendItem, t],
  );

  const resetConversation = useCallback((text: string) => {
    activeAssistantId.current = null;
    setIsRunning(false);
    setItems([
      {
        id: createId(),
        role: 'system',
        text,
        tone: 'muted',
      },
    ]);
  }, []);

  useEffect(() => {
    let isMounted = true;

    window.wexAgent
      .getDefaults()
      .then((defaults) => {
        if (!isMounted) return;

        const defaultProject = {
          id: defaults.cwd,
          name: getProjectName(defaults.cwd),
          path: defaults.cwd,
        };

        setProjects((prev) => (prev.length > 0 ? prev : [defaultProject]));
        setActiveProjectId((prev) => prev ?? defaultProject.id);
        setStatus(t('app.status.workspace', { name: defaultProject.name }));
      })
      .catch((err) => {
        if (!isMounted) return;

        appendItem({
          id: createId(),
          role: 'system',
          text: (err as Error).message,
          tone: 'error',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [appendItem, t]);

  useEffect(() => {
    return window.wexAgent.onAgentEvent((event) => {
      handleAgentEvent(event);
    });
  }, [handleAgentEvent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [items]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isRunning) return;

    const assistantId = createId();
    activeAssistantId.current = assistantId;
    setPrompt('');
    setIsRunning(true);
    setStatus(t('app.status.starting'));
    setItems((prev) => [
      ...prev,
      { id: createId(), role: 'user', text: trimmed },
      { id: assistantId, role: 'assistant', text: '' },
    ]);

    try {
      await window.wexAgent.sendPrompt({
        prompt: trimmed,
        cwd: activeProject?.path,
      });
    } catch (err) {
      setIsRunning(false);
      activeAssistantId.current = null;
      appendItem({
        id: createId(),
        role: 'system',
        text: (err as Error).message,
        tone: 'error',
      });
    }
  }

  async function activateProject(project: ProjectItem) {
    if (project.id === activeProject?.id) return;

    setActiveProjectId(project.id);
    await window.wexAgent.clearSession();
    setStatus(t('app.status.workspace', { name: project.name }));
    resetConversation(t('app.messages.opened', { name: project.name, path: project.path }));
  }

  async function handleAddProject() {
    try {
      const selection = await window.wexAgent.selectProjectDirectory();
      if (selection.canceled) return;

      const project = {
        id: selection.path,
        name: selection.name,
        path: selection.path,
      };

      setProjects((prev) => (prev.some((item) => item.path === project.path) ? prev : [...prev, project]));
      setActiveProjectId(project.id);
      await window.wexAgent.clearSession();
      setStatus(t('app.status.workspace', { name: project.name }));
      resetConversation(t('app.messages.opened', { name: project.name, path: project.path }));
    } catch (err) {
      appendItem({
        id: createId(),
        role: 'system',
        text: (err as Error).message,
        tone: 'error',
      });
    }
  }

  async function handleClear() {
    await window.wexAgent.clearSession();
    setStatus(t('app.status.cleared'));
    resetConversation(
      activeProject
        ? t('app.messages.sessionClearedProject', { path: activeProject.path })
        : t('app.messages.sessionClearedFresh'),
    );
  }

  return (
    <main className="text-foreground flex h-screen">
      <Sidebar
        activeProject={activeProject}
        projects={projects}
        status={status}
        onActivateProject={(project) => {
          void activateProject(project);
        }}
        onAddProject={() => {
          void handleAddProject();
        }}
      />
      <ContentArea
        activeProject={activeProject}
        isRunning={isRunning}
        items={items}
        prompt={prompt}
        scrollRef={scrollRef}
        onClear={() => {
          void handleClear();
        }}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
