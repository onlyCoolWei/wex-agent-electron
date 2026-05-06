# 昼夜模式实现说明

本文档说明 Electron renderer 中昼夜模式的实现方式，以及后续开发 UI 时应遵守的主题适配约定。

## 实现目标

- 使用 `light` / `dark` class 驱动主题切换，兼容 shadcn/ui 的 `dark:` 样式策略。
- 主题色、语义色和组件色统一来自 `src/styles` 下的 design token。
- 用户选择的主题持久化到 `localStorage`，下次启动保持上次选择。
- React 组件只关心当前主题状态和切换动作，不直接维护 CSS 变量。

## 文件分工

- `src/components/theme-context.ts`：定义 `Theme` 类型、React Context 和 `useTheme()` hook。
- `src/components/theme-provider.tsx`：读取和写入主题状态，并把 `light` / `dark` class 同步到 `document.documentElement`。
- `src/renderer/main.tsx`：用 `ThemeProvider` 包裹 `App`，让 renderer 组件都可以访问主题上下文。
- `src/renderer/App.tsx`：通过 `useTheme()` 读取当前主题，并提供昼夜模式切换按钮。
- `src/styles/theme.css`：集中导入基础色、语义色、组件色和文本样式 token。
- `src/renderer/styles.css`：把 design token 映射给 Tailwind / shadcn，并定义当前应用外壳的具体样式。

## 主题状态流转

`ThemeProvider` 的默认主题是 `dark`，存储 key 是 `wex-agent-theme`。

初始化时会先读取：

```ts
localStorage.getItem('wex-agent-theme');
```

只有值为 `light` 或 `dark` 时才会使用，否则回退到默认主题。

主题变化时，Provider 会执行三件事：

- 移除根节点上的 `light` 和 `dark` class。
- 给 `document.documentElement` 添加当前主题 class。
- 将当前主题写回 `localStorage`。

因此，应用内不要手动给根节点添加或删除 `.dark`，应统一通过 `setTheme()` 触发切换。

## CSS Token 分层

主题 token 分为三层：

- 基础色：`colors-base.light.css` 和 `colors-base.dark.css` 定义纯色板。
- 语义色：`colors-semantic.css` 将基础色映射为 `--background`、`--foreground`、`--primary`、`--border`、`--brand-color` 等业务语义。
- 组件色与文本：`colors-component.css` 和 `text-styles.css` 定义滚动条、文本 utility 等组件级能力。

浅色主题变量定义在 `:root`，深色主题变量定义在 `.dark`。根节点 class 变化后，同一组语义变量会自动指向不同基础色。

## shadcn/ui 与 Tailwind 映射

`src/renderer/styles.css` 中的 `@theme inline` 会把 CSS 变量映射为 Tailwind v4 可用的主题 token，例如：

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-border: var(--border);
  --color-ring: var(--ring);
}
```

shadcn/ui 组件依赖这些 Tailwind token，例如 `bg-background`、`text-foreground`、`border-input`、`focus-visible:ring-ring/50`。因此新增 shadcn 组件后，优先使用组件默认 class，不要在组件内硬编码颜色。

项目还定义了：

```css
@custom-variant dark (&:is(.dark *));
```

这让 Tailwind 的 `dark:` variant 跟随根节点 `.dark` class 工作。

## 组件开发约定

新增 renderer UI 时遵守以下约定：

- 主题切换只通过 `useTheme()` 暴露的 `theme` 和 `setTheme()` 完成。
- 优先使用 shadcn/ui 组件和 Tailwind 语义 class，例如 `bg-card`、`text-muted-foreground`、`border-border`。
- 自定义 CSS 优先使用语义 token，例如 `var(--brand-color)`、`var(--text-color-secondary)`、`var(--bg-color-container)`。
- 避免直接使用 `#fff`、`#000` 或固定透明色，除非该颜色不随主题变化且有明确设计原因。
- 需要区分主题的组件级变量，可以在 `:root` 和 `.dark` 中分别定义同名变量。

## 当前切换入口

`App.tsx` 中的主题按钮使用 `Sun` / `Moon` 图标，并根据当前主题切换到另一种模式：

```ts
function handleToggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark');
}
```

按钮文案通过 `aria-label` 暴露给辅助技术，视觉上由 CSS 控制图标显隐。

## 验证建议

修改昼夜模式相关代码后，至少运行：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

同时建议手动在应用中切换 Light / Dark，检查以下区域：

- 页面背景和卡片背景是否有足够对比度。
- 输入框、按钮、焦点 ring 和边框是否清晰。
- shadcn/ui 新增组件是否正确响应 `.dark`。
- `localStorage` 中的 `wex-agent-theme` 是否能在刷新后恢复主题。
