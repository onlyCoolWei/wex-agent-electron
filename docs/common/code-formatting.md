# 代码格式化与规范统一

本文档说明多人协作时如何统一项目代码风格，避免因为编辑器、个人习惯或提交遗漏导致格式差异。

## 工具分工

- EditorConfig：统一不同编辑器的基础行为，例如 UTF-8、LF 换行、2 空格缩进、文件末尾换行。
- Prettier：统一纯格式问题，例如缩进、引号、分号、换行宽度和尾逗号。
- ESLint：检查 TypeScript、React Hooks 和潜在代码质量问题。
- Husky + lint-staged：在提交前只处理本次暂存的文件，降低协作中未格式化代码进入仓库的概率。

## Prettier 规则

项目以 `.prettierrc.json` 为唯一格式化规则来源，当前约定包括：

- TypeScript / JavaScript 使用单引号，JSX 属性保持双引号。
- 保留分号、对象括号空格、尾逗号和箭头函数参数括号。
- 每行最大宽度为 120，缩进为 2 个空格，换行符为 LF。
- 启用 `prettier-plugin-tailwindcss`，自动整理 Tailwind class 顺序。

## 常用命令

```bash
pnpm format
```

格式化整个项目。

```bash
pnpm format:check
```

检查项目是否符合 Prettier 格式，适合在 CI 中使用。

```bash
pnpm lint
```

运行 ESLint 检查。

```bash
pnpm lint:fix
```

自动修复 ESLint 能处理的问题。

```bash
pnpm quality
```

依次运行格式检查、Lint 和 TypeScript 类型检查，适合合并前本地自检。

## 提交流程

安装依赖后，`prepare` 脚本会初始化 Husky：

```bash
pnpm install
```

提交代码时，`.husky/pre-commit` 会执行：

```bash
pnpm lint-staged
```

它会对暂存的代码文件先运行 Prettier，再运行 ESLint 自动修复；对 JSON、CSS、Markdown、YAML 等文件运行 Prettier。若检查失败，需要修复后重新提交。

## 团队约定

- 开发前先执行 `pnpm install`，确保本地依赖和提交钩子可用。
- 提交前优先运行 `pnpm quality`，减少 CI 失败。
- 不要手动争论格式细节，以 `.prettierrc.json` 和 ESLint 配置为准。
- 如果需要调整格式规则，应先团队达成一致，再修改配置和本文档。

## CI 建议

CI 中建议至少执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

这样即使有人绕过本地提交钩子，远端流水线也能拦截不符合规范的代码。
