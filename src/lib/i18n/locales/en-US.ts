import type { LocaleDictionary } from './zh-CN';

export const enUS = {
  app: {
    brand: 'Wex Agent',
    status: {
      ready: 'Ready',
      workspace: 'Workspace: {{name}}',
      thinking: 'Thinking, turn {{turn}}',
      error: 'Error',
      done: 'Done: {{reason}}, {{turns}} turns, {{inputTokens}}+{{outputTokens}} tokens',
      starting: 'Starting agent loop',
      cleared: 'Session cleared',
    },
    messages: {
      ready:
        'Wex Agent Electron is ready. The agent core runs in Electron main process with the same loop, DeepSeek streaming call, and tools as wex-agent.',
      opened: 'Opened {{name}}. The agent will use {{path}} as its working directory.',
      sessionClearedProject: 'Session cleared. The next prompt will run in {{path}}.',
      sessionClearedFresh: 'Session cleared. The next prompt starts a fresh message history.',
      runningTool: 'Running {{name}} {{input}}',
    },
    roles: {
      user: 'User',
      assistant: 'Assistant',
      tool: 'Tool',
      system: 'System',
    },
  },
  sidebar: {
    ariaLabel: 'Sidebar',
    toolbarLabel: 'Toolbar',
    addProject: 'Add project',
    projects: 'Projects',
    status: 'Status',
  },
  content: {
    emptyProjectTitle: 'Select a project',
    emptyProjectPath: 'Click "Add project" to choose a primary workspace',
    clearSession: 'Clear session',
    promptActive: 'Ask the agent to work in {{name}}...',
    promptEmpty: 'Add a project, then ask the agent to inspect, edit, or run commands...',
    assistantPending: '...',
    send: 'Send',
    running: 'Running',
  },
  language: {
    label: 'Language',
    toggleLabel: 'Switch language',
    zhCN: '中文',
    enUS: 'EN',
  },
  settings: {
    label: 'Settings',
    theme: {
      label: 'Theme mode',
      light: 'Light mode',
      dark: 'Dark mode',
      system: 'Use system setting',
    },
    language: {
      label: 'Language',
      zhCN: 'Simplified Chinese',
      enUS: 'English',
    },
  },
} as const satisfies LocaleDictionary;
