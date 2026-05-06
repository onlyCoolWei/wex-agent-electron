import { FormEvent, useEffect, useRef, useState } from "react";
import type { AgentEvent } from "../shared/ipc";

type ChatItem = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  text: string;
  tone?: "error" | "muted";
};

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatToolInput(input: Record<string, unknown>) {
  const text = JSON.stringify(input);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

export function App() {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [cwd, setCwd] = useState("");
  const [maxTurns, setMaxTurns] = useState(25);
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [items, setItems] = useState<ChatItem[]>([
    {
      id: createId(),
      role: "system",
      text: "Wex Agent Electron is ready. The agent core runs in Electron main process with the same loop, DeepSeek streaming call, and tools as wex-agent.",
      tone: "muted",
    },
  ]);

  const activeAssistantId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.wexAgent.getDefaults().then((defaults) => {
      setCwd(defaults.cwd);
      setModel(defaults.model);
      setMaxTurns(defaults.maxTurns);
      setHasEnvApiKey(defaults.hasEnvApiKey);
    });

    return window.wexAgent.onAgentEvent((event) => {
      handleAgentEvent(event);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items]);

  function appendItem(item: ChatItem) {
    setItems((prev) => [...prev, item]);
  }

  function appendAssistantText(text: string) {
    const id = activeAssistantId.current;
    if (!id) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, text: `${item.text}${text}` } : item
      )
    );
  }

  function handleAgentEvent(event: AgentEvent) {
    if (event.type === "turn") {
      setStatus(`Thinking, turn ${event.turn}`);
      return;
    }
    if (event.type === "text") {
      appendAssistantText(event.text);
      return;
    }
    if (event.type === "tool_start") {
      appendItem({
        id: createId(),
        role: "tool",
        text: `Running ${event.name} ${formatToolInput(event.input)}`,
        tone: "muted",
      });
      return;
    }
    if (event.type === "tool_result") {
      appendItem({
        id: createId(),
        role: "tool",
        text: `${event.name}: ${event.result.content.slice(0, 360)}`,
        tone: event.result.isError ? "error" : "muted",
      });
      return;
    }
    if (event.type === "error") {
      setStatus("Error");
      appendItem({
        id: createId(),
        role: "system",
        text: event.message,
        tone: "error",
      });
      return;
    }
    if (event.type === "done") {
      setStatus(
        `Done: ${event.result.reason}, ${event.result.state.turnCount} turns, ${event.result.state.totalInputTokens}+${event.result.state.totalOutputTokens} tokens`
      );
      setIsRunning(false);
      activeAssistantId.current = null;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isRunning) return;

    const assistantId = createId();
    activeAssistantId.current = assistantId;
    setPrompt("");
    setIsRunning(true);
    setStatus("Starting agent loop");
    setItems((prev) => [
      ...prev,
      { id: createId(), role: "user", text: trimmed },
      { id: assistantId, role: "assistant", text: "" },
    ]);

    try {
      await window.wexAgent.sendPrompt({
        prompt: trimmed,
        apiKey: apiKey.trim() || undefined,
        model,
        cwd,
        maxTurns,
      });
    } catch (err) {
      setIsRunning(false);
      activeAssistantId.current = null;
      appendItem({
        id: createId(),
        role: "system",
        text: (err as Error).message,
        tone: "error",
      });
    }
  }

  async function handleClear() {
    await window.wexAgent.clearSession();
    activeAssistantId.current = null;
    setIsRunning(false);
    setStatus("Session cleared");
    setItems([
      {
        id: createId(),
        role: "system",
        text: "Session cleared. The next prompt starts a fresh message history.",
        tone: "muted",
      },
    ]);
  }

  return (
    <main className="shell">
      <section className="sidebar">
        <div>
          <p className="eyebrow">Desktop Agent</p>
          <h1>Wex Agent Electron</h1>
          <p className="lede">
            React + Vite + Electron shell around the original wex-agent loop.
          </p>
        </div>

        <label>
          DeepSeek API Key
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type="password"
            placeholder={hasEnvApiKey ? "Using DEEPSEEK_API_KEY from .env" : "sk-..."}
          />
        </label>

        <label>
          Model
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>

        <label>
          Working Directory
          <input value={cwd} onChange={(event) => setCwd(event.target.value)} />
        </label>

        <label>
          Max Turns
          <input
            value={maxTurns}
            onChange={(event) => setMaxTurns(Number(event.target.value))}
            type="number"
            min={1}
            max={100}
          />
        </label>

        <button className="ghost" type="button" onClick={handleClear}>
          Clear Session
        </button>

        <div className="status">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="transcript" ref={scrollRef}>
          {items.map((item) => (
            <article className={`bubble ${item.role} ${item.tone ?? ""}`} key={item.id}>
              <div className="role">{item.role}</div>
              <p>{item.text || (item.role === "assistant" ? "..." : "")}</p>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the agent to inspect, edit, run commands, or search files..."
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button disabled={isRunning || !prompt.trim()} type="submit">
            {isRunning ? "Running" : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}
