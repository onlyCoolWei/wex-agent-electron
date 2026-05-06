import { z } from 'zod';

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

export interface Tool<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  call(input: TInput, context: ToolContext): Promise<ToolResult>;
  isReadOnly?: boolean;
}

export interface ToolContext {
  cwd: string;
  abortSignal?: AbortSignal;
}

export type StopReason = 'completed' | 'aborted' | 'error' | 'max_turns';

export interface LoopState {
  messages: Message[];
  turnCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface LoopResult {
  reason: StopReason;
  state: LoopState;
  error?: string;
}

export interface AgentConfig {
  apiKey: string;
  model: string;
  maxTurns: number;
  systemPrompt: string;
  cwd: string;
}

export interface AgentEvents {
  onText?: (text: string) => void;
  onToolStart?: (name: string, input: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onError?: (message: string) => void;
  onTurn?: (turnCount: number) => void;
}
