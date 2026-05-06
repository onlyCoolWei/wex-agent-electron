import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/components/theme-context';
import { cn } from '@/lib/utils';
import type { AgentEvent } from '../shared/ipc';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  tone?: 'error' | 'muted';
};

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatToolInput(input: Record<string, unknown>) {
  const text = JSON.stringify(input);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

export function App() {
  const { theme, setTheme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Ready');
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

  async function handleClear() {
    await window.wexAgent.clearSession();
    activeAssistantId.current = null;
    setIsRunning(false);
    setStatus('Session cleared');
    setItems([
      {
        id: createId(),
        role: 'system',
        text: 'Session cleared. The next prompt starts a fresh message history.',
        tone: 'muted',
      },
    ]);
  }

  function handleToggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <main className="shell">
      <Card className="sidebar">
        <div className="hero">
          <div>
            <p className="eyebrow">Desktop Agent</p>
            <h1>Wex Agent Electron</h1>
            <p className="lede">React + Vite + Electron shell around the original wex-agent loop.</p>
          </div>
          <Button
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="theme-toggle"
            size="icon"
            type="button"
            variant="outline"
            onClick={handleToggleTheme}
          >
            <Sun className={cn('theme-icon', theme === 'dark' && 'is-hidden')} />
            <Moon className={cn('theme-icon', theme === 'light' && 'is-hidden')} />
          </Button>
        </div>

        <Button className="ghost" type="button" variant="secondary" onClick={handleClear}>
          Clear Session
        </Button>

        <div className="status">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </Card>

      <Card className="workspace">
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
            placeholder="Ask the agent to inspect, edit, run commands, or search files..."
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
