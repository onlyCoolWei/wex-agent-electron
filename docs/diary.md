### 2026-05-06

- 🥳 wex-agent-electron初始化
- ✨ 新增 Cursor 项目配置：添加项目 onboarding rule 与 stop hook，支持自动记录开发日志
- 🧹 新增团队代码格式化与规范配置：集成 Prettier、ESLint、Husky、lint-staged，并补充 `docs/common` 技术文档
- 🎨 调整 Prettier 规则：启用单引号、120 字符宽度和 `prettier-plugin-tailwindcss`
- 🧩 引入 shadcn/ui 基础配置：接入 Tailwind CSS v4、组件生成配置与 `cn` 工具函数
- 🎛️ 接入项目 design token：引入 `src/styles` 主题变量并让 renderer 样式消费语义色
- 🌓 适配 shadcn/ui 与昼夜模式：新增基础 UI 组件、主题 Provider，并重构主界面控件
- 📝 新增昼夜模式技术文档：说明主题状态、design token、shadcn 映射与开发约定
