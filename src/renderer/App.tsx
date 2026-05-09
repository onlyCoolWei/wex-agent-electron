import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([
    {
      id: createId(),
      role: 'system',
      text: 'Wex Agent Electron is ready. The agent core runs in Electron main process with the same loop, DeepSeek streaming call, and tools as wex-agent.',
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
        setStatus(`Thinking, turn ${event.turn}`);
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
          text: `Running ${event.name} ${formatToolInput(event.input)}`,
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
        setStatus('Error');
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
          `Done: ${event.result.reason}, ${event.result.state.turnCount} turns, ${event.result.state.totalInputTokens}+${event.result.state.totalOutputTokens} tokens`,
        );
        setIsRunning(false);
        activeAssistantId.current = null;
      }
    },
    [appendAssistantText, appendItem],
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
        setStatus(`Workspace: ${defaultProject.name}`);
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
  }, [appendItem]);

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
    setStatus('Starting agent loop');
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
    setStatus(`Workspace: ${project.name}`);
    resetConversation(`Opened ${project.name}. The agent will use ${project.path} as its working directory.`);
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
      setStatus(`Workspace: ${project.name}`);
      resetConversation(`Opened ${project.name}. The agent will use ${project.path} as its working directory.`);
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
    setStatus('Session cleared');
    resetConversation(
      activeProject
        ? `Session cleared. The next prompt will run in ${activeProject.path}.`
        : 'Session cleared. The next prompt starts a fresh message history.',
    );
  }

  return (
    <main className="bg-background text-foreground flex h-screen">
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
