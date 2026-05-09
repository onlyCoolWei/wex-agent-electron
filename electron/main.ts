import 'dotenv/config';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { basename, join } from 'node:path';
import type { Message } from '../src/agent/types.js';
import { buildSystemPrompt } from '../src/agent/context.js';
import { agenticLoop } from '../src/agent/loop.js';
import type {
  AgentClearResult,
  AgentDefaults,
  AgentEvent,
  AgentSendPayload,
  AgentSessionSnapshot,
  ProjectDirectorySelection,
} from '../src/shared/ipc.js';

let mainWindow: BrowserWindow | null = null;
let sessionMessages: Message[] = [];

function sendAgentEvent(event: AgentEvent) {
  mainWindow?.webContents.send('agent:event', event);
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0c0f12',
    title: 'Wex Agent Electron',
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    frame: !isMac,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle(
  'agent:defaults',
  (): AgentDefaults => ({
    cwd: process.cwd(),
    model: 'deepseek-chat',
    maxTurns: 25,
    hasEnvApiKey: Boolean(process.env.DEEPSEEK_API_KEY),
  }),
);

ipcMain.handle('agent:clear', (): AgentClearResult => {
  sessionMessages = [];
  return { ok: true };
});

ipcMain.handle(
  'agent:snapshot',
  (): AgentSessionSnapshot => ({
    messages: sessionMessages,
  }),
);

ipcMain.handle('project:select-directory', async (): Promise<ProjectDirectorySelection> => {
  const options = {
    title: '选择项目目录',
    buttonLabel: '打开项目',
    properties: ['openDirectory', 'createDirectory'],
  } satisfies Electron.OpenDialogOptions;
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);

  const selectedPath = result.filePaths[0];
  if (result.canceled || !selectedPath) {
    return { canceled: true };
  }

  return {
    canceled: false,
    path: selectedPath,
    name: basename(selectedPath) || selectedPath,
  };
});

ipcMain.handle('agent:send', async (_event, payload: AgentSendPayload) => {
  const apiKey = payload.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const message = 'API key required. Set DEEPSEEK_API_KEY in .env.';
    sendAgentEvent({ type: 'error', message });
    throw new Error(message);
  }

  const config = {
    apiKey,
    model: payload.model || 'deepseek-chat',
    maxTurns: payload.maxTurns || 25,
    systemPrompt: buildSystemPrompt(payload.cwd || process.cwd()),
    cwd: payload.cwd || process.cwd(),
  };

  const result = await agenticLoop(config, payload.prompt, sessionMessages, {
    onTurn: (turn) => sendAgentEvent({ type: 'turn', turn }),
    onText: (text) => sendAgentEvent({ type: 'text', text }),
    onToolStart: (name, input) => sendAgentEvent({ type: 'tool_start', name, input }),
    onToolResult: (name, result) => sendAgentEvent({ type: 'tool_result', name, result }),
    onError: (message) => sendAgentEvent({ type: 'error', message }),
  });

  sessionMessages = result.state.messages;
  sendAgentEvent({ type: 'done', result });
  return result;
});
