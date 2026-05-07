import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AgentEvent } from '../shared/ipc';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  tone?: 'error' | 'muted';
};

type ProjectItem = {
  id: string;
  name: string;
  path: string;
};

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
    <main className="shell">
      <aside className="app-sidebar" aria-label="侧边栏">
        <Card className="sidebar project-sidebar">
          <div className="project-header">
            <Button
              aria-label="新增项目"
              className="add-project"
              size="icon-sm"
              type="button"
              variant="secondary"
              onClick={handleAddProject}
            >
              <FolderPlus />
            </Button>
            <Button className="new-project-button" type="button" variant="secondary" onClick={handleAddProject}>
              新增项目
            </Button>
          </div>

          <section className="project-directory" aria-label="项目目录">
            <div className="section-title">
              <span>项目</span>
              <strong>目录</strong>
            </div>
            <div className="project-list">
              {projects.map((project) => (
                <button
                  className={cn('project-card', project.id === activeProject?.id && 'active')}
                  key={project.id}
                  type="button"
                  onClick={() => {
                    void activateProject(project);
                  }}
                >
                  <span className="project-icon">
                    <FolderOpen />
                  </span>
                  <span className="project-copy">
                    <strong>{project.name}</strong>
                    <small>{project.path}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="status">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
        </Card>
      </aside>

      <Card className="workspace">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Wex Agent</p>
            <h1>{activeProject?.name ?? '选择项目'}</h1>
            <p className="workspace-path">{activeProject?.path ?? '点击“新增项目”选择主要工作空间'}</p>
          </div>
          <Button className="ghost" type="button" variant="secondary" onClick={handleClear}>
            Clear Session
          </Button>
        </header>

        <div className="transcript" ref={scrollRef}>
          {items.map((item) => (
            <article className={`bubble ${item.role} ${item.tone ?? ''}`} key={item.id}>
              <Badge className="role" variant={item.tone === 'error' ? 'destructive' : 'secondary'}>
                {item.role}
              </Badge>
              <p>{item.text || (item.role === 'assistant' ? '...' : '')}</p>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              activeProject
                ? `Ask the agent to work in ${activeProject.name}...`
                : '新增项目后开始让 agent 检查、编辑或运行命令...'
            }
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button className="send-button" disabled={isRunning || !prompt.trim()} type="submit">
            {isRunning ? 'Running' : 'Send'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
