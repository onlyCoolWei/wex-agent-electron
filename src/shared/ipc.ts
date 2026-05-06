import type { LoopResult, Message, ToolResult } from '../agent/types.js';

export interface AgentSendPayload {
  prompt: string;
  apiKey?: string;
  model?: string;
  cwd?: string;
  maxTurns?: number;
}

export interface AgentDefaults {
  cwd: string;
  model: string;
  maxTurns: number;
  hasEnvApiKey: boolean;
}

export type AgentEvent =
  | { type: 'turn'; turn: number }
  | { type: 'text'; text: string }
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: ToolResult }
  | { type: 'error'; message: string }
  | { type: 'done'; result: LoopResult };

export interface AgentClearResult {
  ok: true;
}

export interface AgentSessionSnapshot {
  messages: Message[];
}
