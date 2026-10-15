# 更新说明

本文件记录 `@jelly-kits/jelly-ui-uniapp` 每个版本**面向使用方**的变更，按版本倒序排列。

- 版本号与 npm 上的包、仓库里的 `vX.Y.Z` 标签一一对应。
- 发版时先在这里把「未发布」小节改成实际版本号，再执行 `npm version`（提交信息只会是版本号本身）。
  完整流程见 [PUBLISHING.md](./PUBLISHING.md)。
- 分类沿用 Keep a Changelog 的口径：**新增 / 优化 / 修复 / 文档 / 工程**。
  「工程」是不影响使用方的内部改动，只想看组件用法可以跳过。

## 未发布

### 新增

- **je-tree-select 新增 `defaultExpandAll`**：控制面板里的树初始是否展开所有节点，默认 `true`，
  打开面板即可看到完整层级，不必逐级点开；传 `false` 可退回「只显示第一层」的行为。
- **表单内选择型 / 输入型组件统一支持 `size` 尺寸档位**（`small` / `default` / `large`，与 `JeButton`
  同一口径）：不传时取祖先 `JeConfigProvider` 的全局配置，仍未配置时按 `default`；图标随档位缩放。
  覆盖 je-select、je-cascader、je-date-picker、je-time-picker、je-time-select、je-tree-select、
  je-picker、je-area、je-input-number、je-search、je-auto-complete、je-password-input、
  je-checkbox-group、je-radio-group、je-segmented、je-switch、je-slider、je-stepper；
  je-input / je-color-picker / je-button 原有的 `size` 也改为走同一条回退链。
- **`je-stepper` 的 `buttonSize` / `inputWidth` 默认值改为由 `size` 档位决定**：不传时 small 28 / 44、
  default 32 / 48、large 40 / 56，显式传值仍然优先。

### 修复

- **窄屏下尺寸档位被 44px 触控热区拉平**：je-color-picker、je-pagination 的 `small` 档位现在收在
  32px。此前这些档位在窄屏一律被抬到 44px，等于小号 / 大号都失效。

### 优化

- **下拉框右侧箭头统一成 je-picker 那款 chevron-down 图标**：je-select、je-cascader、je-date-picker、
  je-time-select、je-tree-select 原来是 CSS 画的折角（12×12 旋转 45° + 2px 描边，视觉上偏大偏重），
  现在统一为 16px 的 chevron-down，展开时翻转 180°，颜色跟随触发器（空态浅灰、有值时正文色）。
  je-color-picker 的箭头也从 14px 提到 16px 一档。
- **表单控件默认高度统一到 44px**：je-button、je-input、je-cell、je-select、je-input-number、
  je-cascader、je-date-picker、je-picker、je-time-select、je-time-picker、je-area、je-color-picker、
  je-tree-select、je-segmented、je-checkbox-group、je-radio-group 由「上下 padding 撑高度」
  （默认落在 46 ~ 54px）改为「定高 + 左右内边距」，高度三档统一为 44 / 32 / 50px
  （`--je-touch-h-*`，与 Vant 4 及主库触屏档同口径），同一表单行里的控件不再参差。
  只有文本域（je-input 的 textarea）仍由内容撑高。
- **je-checkbox-group / je-radio-group**：选项由「一个占一行」改为一行排多个、放不下自动换行，
  不再浪费右侧空白；选项间距与水平内边距同步收紧（组内间距 12 → 8px、选项水平内边距 14 → 10px），
  窄屏（375px）下选项所在容器往往只有 190px 上下，原先两个刚好差几像素放不下、被挤成一行一个。

### 文档

- **文档站左侧菜单显示组件代码名**（如 `Button 按钮`）：由 `api-data.ts` 派生，不在菜单数据里
  重复维护；搜索同时匹配代码名。

## 0.1.0

首个公开版本：组件库本体 + 自带文档站。
