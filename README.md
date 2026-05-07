# Wex Agent Electron

Wex Agent Electron 是 `wex-agent` 的 Electron 桌面版。它使用 React + Vite 提供桌面图形界面，并在 Electron main process 中运行 Agent 核心，复用 agentic loop、DeepSeek 流式调用和工具调用体系。

## 功能特性

- 桌面端聊天界面，支持连续会话与清空上下文。
- Agent 核心运行在 Electron 主进程，renderer 通过安全 IPC 调用能力。
- 支持 DeepSeek 兼容 OpenAI SDK 的流式输出。
- 内置文件读取、文件写入、文件编辑、命令执行、grep、glob 等工具。
- 支持在界面中配置工作目录、模型名称、最大轮数和 API Key。
- 接入 shadcn/ui、Tailwind CSS v4 与昼夜主题。

## 技术栈

- TypeScript + ESM
- Electron + electron-vite
- React 19 + Vite
- Tailwind CSS v4 + shadcn/ui
- OpenAI SDK 兼容 DeepSeek API
- Zod 工具输入校验
- pnpm 包管理

## 快速开始

安装依赖：

```bash
pnpm install
```

配置 DeepSeek API Key。可以写入本地 `.env`：

```bash
DEEPSEEK_API_KEY=your_api_key_here
```

也可以在应用界面中手动输入 API Key。

启动开发环境：

```bash
pnpm dev
```

构建应用：

```bash
pnpm build
```

打包发行版：

```bash
pnpm dist:mac
pnpm dist:win
pnpm dist:all
```

产物会输出到 `release/` 目录。macOS 默认生成 universal 架构的 `dmg` 与 `zip`，Windows 默认生成 x64 的 `nsis` 安装包与 `zip`。

预览构建产物：

```bash
pnpm preview
```

## 常用脚本

| 命令                | 说明                              |
| ------------------- | --------------------------------- |
| `pnpm dev`          | 启动 Electron 开发环境            |
| `pnpm build`        | TypeScript 类型检查并构建应用     |
| `pnpm dist:dir`     | 生成未压缩的本地应用目录          |
| `pnpm dist`         | 使用当前平台生成发行包            |
| `pnpm dist:mac`     | 生成 macOS 发行包                 |
| `pnpm dist:win`     | 生成 Windows 发行包               |
| `pnpm dist:all`     | 生成 macOS 与 Windows 发行包      |
| `pnpm preview`      | 预览构建产物                      |
| `pnpm typecheck`    | 仅运行 TypeScript 类型检查        |
| `pnpm lint`         | 运行 ESLint                       |
| `pnpm lint:fix`     | 自动修复 ESLint 问题              |
| `pnpm format`       | 使用 Prettier 格式化代码          |
| `pnpm format:check` | 检查代码格式                      |
| `pnpm quality`      | 依次运行格式检查、Lint 和类型检查 |

## 项目结构

```text
.
├── electron/
│   ├── main.ts          # Electron 主进程、窗口创建、IPC handler
│   └── preload.ts       # 安全暴露 renderer 可调用的 API
├── src/
│   ├── agent/           # Agent loop、模型调用、工具定义
│   ├── components/      # UI 基础组件
│   ├── renderer/        # React 应用入口与界面
│   ├── shared/          # main / preload / renderer 共享类型
│   └── styles/          # 主题变量与全局样式
├── docs/
│   ├── common/          # 技术文档
│   └── diary.md         # 开发日志
├── electron-builder.yml # Electron 发行包配置
├── electron.vite.config.ts
└── package.json
```

## 运行方式

1. Renderer 负责展示聊天界面和收集用户输入。
2. Preload 通过 `contextBridge` 暴露受控的 `window.wexAgent` API。
3. Main process 处理 IPC 请求，组装 Agent 配置并启动 `agenticLoop`。
4. Agent 调用 DeepSeek 模型，按需执行工具，并通过事件把文本、工具状态和完成结果推送回界面。

## 环境变量

| 变量               | 必填 | 说明                                       |
| ------------------ | ---- | ------------------------------------------ |
| `DEEPSEEK_API_KEY` | 否   | DeepSeek API Key。未配置时可在应用界面输入 |

## 开发约定

- 保持 main / preload / renderer 分层清晰，renderer 不直接访问 Node 或 Electron 能力。
- 新增跨进程能力时，优先在 `src/shared/ipc.ts` 定义共享类型，再通过 preload 暴露。
- 新增 Agent 工具时使用 Zod 定义输入 schema，并在 `src/agent/tools/index.ts` 注册。
- 跨目录导入运行时代码时遵循现有 `.js` 后缀约定。
- 有实际代码或配置变更时，在 `docs/diary.md` 记录简短中文摘要。
