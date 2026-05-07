import { contextBridge, ipcRenderer } from 'electron';
import type {
  AgentClearResult,
  AgentDefaults,
  AgentEvent,
  AgentSendPayload,
  AgentSessionSnapshot,
  ProjectDirectorySelection,
} from '../src/shared/ipc.js';
import type { LoopResult } from '../src/agent/types.js';

const api = {
  getDefaults: () => ipcRenderer.invoke('agent:defaults') as Promise<AgentDefaults>,
  clearSession: () => ipcRenderer.invoke('agent:clear') as Promise<AgentClearResult>,
  getSnapshot: () => ipcRenderer.invoke('agent:snapshot') as Promise<AgentSessionSnapshot>,
  sendPrompt: (payload: AgentSendPayload) => ipcRenderer.invoke('agent:send', payload) as Promise<LoopResult>,
  selectProjectDirectory: () => ipcRenderer.invoke('project:select-directory') as Promise<ProjectDirectorySelection>,
  onAgentEvent: (callback: (event: AgentEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AgentEvent) => callback(data);
    ipcRenderer.on('agent:event', listener);
    return () => {
      ipcRenderer.removeListener('agent:event', listener);
    };
  },
};

contextBridge.exposeInMainWorld('wexAgent', api);

export type WexAgentAPI = typeof api;
