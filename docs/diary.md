### 2026-05-06

- 🥳 wex-agent-electron初始化
- ✨ 新增 Cursor 项目配置：添加项目 onboarding rule 与 stop hook，支持自动记录开发日志
- 🧹 新增团队代码格式化与规范配置：集成 Prettier、ESLint、Husky、lint-staged，并补充 `docs/common` 技术文档
- 🎨 调整 Prettier 规则：启用单引号、120 字符宽度和 `prettier-plugin-tailwindcss`
- 🧩 引入 shadcn/ui 基础配置：接入 Tailwind CSS v4、组件生成配置与 `cn` 工具函数
- 🎛️ 接入项目 design token：引入 `src/styles` 主题变量并让 renderer 样式消费语义色
- 🌓 适配 shadcn/ui 与昼夜模式：新增基础 UI 组件、主题 Provider，并重构主界面控件
- 📝 新增昼夜模式技术文档：说明主题状态、design token、shadcn 映射与开发约定
- 🔧 补充 `.env.example`，保持 `.env` 仅配置 DeepSeek API Key
- 🔍 接入 `code-inspector-plugin`，支持开发时从页面元素定位到源码
- 📝 新增 `code-inspector-plugin` 通用技术接入文档，说明 Vite 配置、触发方式与排障建议

### 2026-05-07

- 📦 修复 macOS universal 打包：调整 Tailwind 构建依赖归类，并排除 Tailwind/Lightning CSS 构建期 native 包
- 📦 调整 macOS 打包架构：分别生成 Intel x64 与 Apple Silicon arm64 产物，并补充单架构打包脚本
- 🗂️ 调整主界面布局：新增项目目录侧边栏与“新增项目”文件夹选择能力，支持以所选目录作为 Agent 工作空间
- 🎛️ 收拢侧边栏结构：将项目目录面板并入左侧侧边栏容器，主工作区仅保留会话内容
- 🧹 精简侧边栏：移除左侧窄导航栏，保留项目目录作为唯一侧边栏内容

### 2026-05-09

- 🐛 修复项目卡片选中态右侧裁切：移除横向位移，避免圆角边框被容器截断
- 🎨 迁移主界面样式到 Tailwind：扩展 design token 映射，收敛 renderer 全局 CSS，仅保留主题入口与基础全局样式
- 🧩 拆分主界面组件：将 `App.tsx` 中的侧边栏和内容区抽离为独立 renderer 组件
- 🎨 收敛 renderer 样式：移除复杂渐变、混色与透明 arbitrary color，统一使用 design token 语义类
- 🧹 精简 renderer 组件样式：移除过度抽象的共享 class 文件，改为在组件内直接使用 token 类
- 🪟 改用原生红黄绿并外置：移除自绘窗口控制与相关 IPC，改为 `titleBarStyle: hidden` + `trafficLightPosition` 把原生按钮定位到 sidebar 顶部工具条，左侧预留位置，右侧可继续追加功能按钮
- 🌐 接入国际化基础设施：新增中英文语言包、`useTranslation()` Hook、Zustand 持久化语言偏好与侧边栏语言切换组件

### 2026-05-10

- 📝 新增国际化实现技术文档：说明语言状态、类型化字典、翻译插值、组件接入与扩展约定
- ⚙️ 完善侧边栏底部设置菜单：支持主题模式与语言切换的悬浮二级菜单，补充跟随系统主题，并统一使用 shadcn/ui Button 与 Select 封装
- 🐛 优化设置菜单交互反馈：改用非 portal 选项列表避免 hover 阻断，并使用 popover/accent 语义色增强一级菜单悬浮与选中态
- 🎨 优化会话区布局与视觉：消息流和输入框统一限制为 `max-w-4xl` 居中显示，输入框改为底部圆角浮层并保持透明文本区域
- ⌨️ 优化会话输入交互：Enter 直接发送消息，Shift+Enter 保留换行
