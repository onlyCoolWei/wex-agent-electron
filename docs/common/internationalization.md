# 国际化实现说明

本文档说明 Electron renderer 中国际化的实现方式，以及后续新增界面文案或语言时应遵守的约定。

## 实现目标

- 支持 `zh-CN` / `en-US` 两套界面语言，并默认使用中文。
- 语言偏好持久化到 `localStorage`，下次启动保持上次选择。
- 翻译 key 使用 TypeScript 类型约束，减少拼写错误和语言包缺项。
- React 组件通过统一的 `useTranslation()` Hook 读取当前语言和翻译函数。

## 文件分工

- `src/lib/i18n/useLanguageStore.ts`：定义支持的语言列表、`Language` 类型和 Zustand 持久化 store。
- `src/lib/i18n/locales/zh-CN.ts`：中文基准语言包，并导出 `LocaleDictionary` 类型。
- `src/lib/i18n/locales/en-US.ts`：英文语言包，通过 `satisfies LocaleDictionary` 与中文结构保持一致。
- `src/lib/i18n/index.ts`：汇总语言包，提供 `useTranslation()`、`TranslationKey` 和插值能力。
- `src/components/language-toggle.tsx`：侧边栏顶部语言切换组件。
- `src/renderer/App.tsx`、`src/renderer/components/ContentArea.tsx`、`src/renderer/components/Sidebar.tsx`：消费翻译文案的主要界面组件。

## 语言状态

语言状态由 Zustand 管理，并通过 `persist` 中间件写入浏览器 `localStorage`：

```ts
export const languages = ['zh-CN', 'en-US'] as const;

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'wex-agent-language',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

当前存储 key 是 `wex-agent-language`。组件只应通过 `useLanguageStore()` 读取或设置语言，不要直接读写该 localStorage key。

## 翻译字典与类型约束

中文语言包是字典结构的源头：

```ts
export const zhCN = {
  app: {
    brand: 'Wex Agent',
    status: {
      ready: '就绪',
    },
  },
} as const;
```

`LocaleDictionary` 会把中文语言包中的字符串字面量拓宽为 `string`，保留嵌套结构：

```ts
type WidenLocale<T> = {
  readonly [Key in keyof T]: T[Key] extends string ? string : WidenLocale<T[Key]>;
};

export type LocaleDictionary = WidenLocale<typeof zhCN>;
```

英文语言包使用：

```ts
export const enUS = {
  // ...
} as const satisfies LocaleDictionary;
```

因此，新增中文 key 后，如果英文语言包没有补齐同样结构，TypeScript 会在类型检查时报错。

## TranslationKey

`src/lib/i18n/index.ts` 通过递归类型把嵌套字典展开为点分路径：

```ts
type DotPath<T> = {
  [Key in keyof T & string]: T[Key] extends string ? Key : `${Key}.${DotPath<T[Key]>}`;
}[keyof T & string];

export type TranslationKey = DotPath<LocaleDictionary>;
```

组件调用 `t()` 时只能传入存在于语言包中的 key，例如：

```ts
t('sidebar.addProject');
t('content.promptActive', { name: activeProject.name });
```

这能让错误的 key 在编译阶段暴露，而不是运行时才显示异常文案。

## 翻译查找与插值

`useTranslation()` 会读取当前语言，按 key 在对应字典中查找文案：

```ts
const dictionaries: Record<Language, LocaleDictionary> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
```

查找不到字符串时会返回 key 本身，方便开发时在界面上发现缺失文案。

插值使用 `{{name}}` 这样的占位符：

```ts
function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''));
}
```

当前插值值支持 `string`、`number`、`boolean`、`null`、`undefined`。如果占位符没有传入对应参数，会被替换为空字符串。

## 组件接入方式

普通组件通过 `useTranslation()` 获取 `t`：

```tsx
const { t } = useTranslation();

return <Button>{t('sidebar.addProject')}</Button>;
```

需要切换语言的组件额外使用 `useLanguageStore()`：

```tsx
const { language, t } = useTranslation();
const setLanguage = useLanguageStore((state) => state.setLanguage);
```

`LanguageToggle` 根据 `languages` 渲染按钮，避免语言列表在组件内重复维护。按钮文案本身也来自语言包：

```tsx
{
  languages.map((item) => (
    <Button key={item} onClick={() => setLanguage(item)}>
      {t(languageLabelKeys[item])}
    </Button>
  ));
}
```

## 当前 UI 覆盖范围

已接入国际化的区域包括：

- 应用品牌、状态栏和系统消息。
- 用户、助手、工具、系统等消息角色标签。
- 侧边栏 aria label、项目区标题、状态标题和新增项目按钮。
- 内容区空状态、清空会话按钮、输入框 placeholder、发送 / 运行中按钮。
- 语言切换按钮的可访问性文案和显示文案。

Agent 返回的自然语言内容、工具结果和运行时错误消息目前保持原样展示，不经过 renderer 语言包翻译。

## 切换语言时的行为

切换语言会立即触发 React 重新渲染，因此直接由 `t()` 渲染的按钮、标题、placeholder 和角色标签会同步更新。

需要注意，部分文案会先被翻译成字符串再写入 React state，例如：

- `App.tsx` 中的 `status`。
- 初始系统消息、打开项目提示、清空会话提示。
- 工具运行提示。

这些已经写入会话列表的历史消息不会在切换语言后重新翻译。后续新产生的状态和消息会使用切换后的语言。当前实现保留历史消息原文，避免切换语言时改写已有会话记录。

## 新增文案约定

新增 renderer 文案时遵守以下流程：

1. 先在 `src/lib/i18n/locales/zh-CN.ts` 中新增中文 key。
2. 再在 `src/lib/i18n/locales/en-US.ts` 中补齐同路径英文文案。
3. 在组件中使用 `t('path.to.key')`，不要直接写死面向用户的字符串。
4. 需要动态值时使用 `{{name}}` 格式占位，并通过第二个参数传入值。
5. 新增消息角色、语言代码或语言包结构时，同步更新相关映射类型。

示例：

```ts
// zh-CN.ts
content: {
  retry: '重试 {{count}} 次',
}

// en-US.ts
content: {
  retry: 'Retry {{count}} times',
}

// component.tsx
t('content.retry', { count: retryCount });
```

## 新增语言约定

新增语言时需要：

1. 在 `src/lib/i18n/useLanguageStore.ts` 的 `languages` 中添加语言代码。
2. 新增对应的 `src/lib/i18n/locales/<language>.ts`，并 `satisfies LocaleDictionary`。
3. 在 `src/lib/i18n/index.ts` 的 `dictionaries` 中注册语言包。
4. 在 `src/components/language-toggle.tsx` 中补齐按钮显示文案映射。
5. 在所有语言包的 `language` 分组中补齐新语言的显示名称。

如果要支持更多地区格式化，例如日期、数字、复数规则，建议新增独立格式化 helper，不要把复杂逻辑塞进 `interpolate()`。

## 验证建议

修改国际化相关代码后，至少运行：

```bash
pnpm typecheck
pnpm lint
```

同时建议手动检查：

- 切换 `中文` / `EN` 后，侧边栏、内容区按钮和输入框 placeholder 是否立即更新。
- 刷新或重启 renderer 后，语言是否从 `wex-agent-language` 恢复。
- 新增 key 是否在两套语言包中都存在。
- 带插值的文案是否在中文和英文中都显示正确。
