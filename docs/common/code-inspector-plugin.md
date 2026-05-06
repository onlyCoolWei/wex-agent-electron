# code-inspector-plugin 接入说明

本文档说明如何在基于 Vite 的前端构建链中接入 `code-inspector-plugin`，用于开发环境下从页面 DOM 元素跳转到对应源码位置。

## 技术目标

- 在开发模式中给页面元素注入源码定位能力。
- 通过快捷键悬停和点击页面元素，自动打开本地 IDE 并定位到源文件。
- 只作用于 renderer 构建链，不影响 main / preload 代码。
- 保持生产构建无调试交互入口。

## 依赖安装

使用 pnpm 安装为开发依赖：

```bash
pnpm add code-inspector-plugin -D
```

依赖应放在 `devDependencies` 中，因为它只参与本地开发和构建配置，不属于运行时代码依赖。

## Vite 配置

在 Vite 配置文件中导入插件：

```ts
import { codeInspectorPlugin } from 'code-inspector-plugin';
```

然后把插件加入 renderer 侧的 `plugins`：

```ts
plugins: [react(), tailwindcss(), codeInspectorPlugin({ bundler: 'vite' })];
```

对于 Electron + Vite 项目，应只挂载到 renderer 配置中。main 和 preload 没有 DOM，不需要注入源码定位能力。

## 工作方式

`code-inspector-plugin` 会在开发构建中处理源码，并把组件或元素对应的文件路径、行号、列号等调试信息关联到页面元素上。

开发服务启动后，页面中触发源码定位时，插件会通过本地开发服务请求启动 IDE。IDE 打开后会跳转到对应源码文件的位置。

默认触发方式：

- macOS：按住 `Option + Shift`，鼠标悬停页面元素后点击。
- Windows / Linux：按住 `Alt + Shift`，鼠标悬停页面元素后点击。

触发时页面会显示元素覆盖层，浏览器控制台也会输出快捷键提示。

## 常用配置

最小配置：

```ts
codeInspectorPlugin({
  bundler: 'vite',
});
```

指定 IDE：

```ts
codeInspectorPlugin({
  bundler: 'vite',
  editor: 'cursor',
});
```

当同时运行多个 IDE 时，可以用 `editor` 固定打开目标编辑器，避免自动检测结果不符合预期。

修改快捷键：

```ts
codeInspectorPlugin({
  bundler: 'vite',
  hotKeys: ['metaKey', 'shiftKey'],
});
```

`hotKeys` 可选值包括 `ctrlKey`、`altKey`、`metaKey`、`shiftKey`。在 macOS 中，`metaKey` 对应 Command，`altKey` 对应 Option。

显示页面开关：

```ts
codeInspectorPlugin({
  bundler: 'vite',
  showSwitch: true,
});
```

`showSwitch` 会在页面中显示 Code Inspector 开关，适合不方便使用键盘快捷键的场景。

## 环境边界

插件会根据构建工具环境自动判断开发模式，通常只在 development 环境生效。

如果项目存在自定义环境变量、非标准构建流程或构建工具环境判断失效，可以显式传入 `dev`：

```ts
codeInspectorPlugin({
  bundler: 'vite',
  dev: () => process.env.NODE_ENV === 'development',
});
```

不要在生产环境主动开启源码定位能力，避免暴露本地路径、源码结构或调试入口。

## 验证方式

启动开发服务：

```bash
pnpm dev
```

打开 renderer 页面后，按住默认快捷键并悬停页面元素，确认页面出现元素覆盖层。点击元素后，IDE 应打开对应源码文件并定位到具体行列。

修改配置后建议运行：

```bash
pnpm typecheck
pnpm build
```

`typecheck` 用于验证配置文件类型是否正确，`build` 用于确认生产构建不受开发插件配置影响。

## 排障建议

- 如果点击后没有打开 IDE，先确认本机已安装并能从命令行或协议唤起对应 IDE。
- 如果打开了错误的 IDE，使用 `editor` 参数显式指定编辑器。
- 如果页面没有覆盖层，确认插件已挂载到 renderer 的 Vite 插件数组中，并且当前运行的是开发服务。
- 如果快捷键冲突，使用 `hotKeys` 调整触发组合。
- 如果生产构建出现异常，检查是否通过 `dev` 参数错误地强制启用了插件能力。
