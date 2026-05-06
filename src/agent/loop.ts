import type { AgentConfig, AgentEvents, ContentBlock, LoopResult, LoopState, Message, ToolContext } from './types.js';
import { callModel } from './api.js';
import { findToolByName } from './tools/index.js';

async function executeTools(
  toolUseBlocks: ContentBlock[],
  context: ToolContext,
  events: AgentEvents = {},
): Promise<ContentBlock[]> {
  const results: ContentBlock[] = [];

  for (const block of toolUseBlocks) {
    const tool = findToolByName(block.name!);
    if (!tool) {
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: `Unknown tool: ${block.name}`,
        is_error: true,
      });
      continue;
    }

    const input = block.input ?? {};
    events.onToolStart?.(tool.name, input);

    try {
      const parsed = tool.inputSchema.safeParse(input);
      if (!parsed.success) {
        const result = {
          content: `Invalid input: ${parsed.error.message}`,
          isError: true,
        };
        events.onToolResult?.(tool.name, result);
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.content,
          is_error: true,
        });
        continue;
      }

      const result = await tool.call(parsed.data, context);
      events.onToolResult?.(tool.name, result);

      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.content,
        is_error: result.isError,
      });
    } catch (err: unknown) {
      const result = {
        content: `Tool execution error: ${(err as Error).message}`,
        isError: true,
      };
      events.onToolResult?.(tool.name, result);
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.content,
        is_error: true,
      });
    }
  }

  return results;
}

export async function agenticLoop(
  config: AgentConfig,
  userMessage: string,
  existingMessages: Message[] = [],
  events: AgentEvents = {},
): Promise<LoopResult> {
  const state: LoopState = {
    messages: [...existingMessages, { role: 'user', content: userMessage }],
    turnCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  const toolContext: ToolContext = { cwd: config.cwd };

  while (true) {
    state.turnCount++;
    events.onTurn?.(state.turnCount);

    if (state.turnCount > config.maxTurns) {
      return { reason: 'max_turns', state };
    }

    let response;
    try {
      response = await callModel(config, state.messages, events.onText);
    } catch (err: unknown) {
      const message = (err as Error).message;
      events.onError?.(message);
      return { reason: 'error', state, error: message };
    }

    state.totalInputTokens += response.inputTokens;
    state.totalOutputTokens += response.outputTokens;
    state.messages.push(response.assistantMessage);

    if (response.toolUseBlocks.length === 0) {
      return { reason: 'completed', state };
    }

    const toolResults = await executeTools(response.toolUseBlocks, toolContext, events);

    state.messages.push({
      role: 'user',
      content: toolResults,
    });
  }
}
