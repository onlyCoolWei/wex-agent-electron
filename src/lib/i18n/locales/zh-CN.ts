export const zhCN = {
  app: {
    brand: 'Wex Agent',
    status: {
      ready: '就绪',
      workspace: '工作区：{{name}}',
      thinking: '思考中，第 {{turn}} 轮',
      error: '出错',
      done: '完成：{{reason}}，{{turns}} 轮，{{inputTokens}}+{{outputTokens}} tokens',
      starting: '正在启动 Agent 循环',
      cleared: '会话已清空',
    },
    messages: {
      ready:
        'Wex Agent Electron 已就绪。Agent 核心运行在 Electron 主进程中，复用 wex-agent 的循环、DeepSeek 流式调用和工具体系。',
      opened: '已打开 {{name}}。Agent 会使用 {{path}} 作为工作目录。',
      sessionClearedProject: '会话已清空。下一条提示将在 {{path}} 中运行。',
      sessionClearedFresh: '会话已清空。下一条提示将从全新的消息历史开始。',
      runningTool: '正在运行 {{name}} {{input}}',
    },
    roles: {
      user: '用户',
      assistant: '助手',
      tool: '工具',
      system: '系统',
    },
  },
  sidebar: {
    ariaLabel: '侧边栏',
    toolbarLabel: '工具条',
    addProject: '新增项目',
    projects: '项目',
    status: '状态',
  },
  content: {
    emptyProjectTitle: '选择项目',
    emptyProjectPath: '点击“新增项目”选择主要工作空间',
    clearSession: '清空会话',
    promptActive: '让 Agent 在 {{name}} 中工作...',
    promptEmpty: '新增项目后开始让 Agent 检查、编辑或运行命令...',
    assistantPending: '...',
    send: '发送',
    running: '运行中',
  },
  language: {
    label: '语言',
    toggleLabel: '切换语言',
    zhCN: '中文',
    enUS: 'EN',
  },
} as const;

type WidenLocale<T> = {
  readonly [Key in keyof T]: T[Key] extends string ? string : WidenLocale<T[Key]>;
};

export type LocaleDictionary = WidenLocale<typeof zhCN>;
