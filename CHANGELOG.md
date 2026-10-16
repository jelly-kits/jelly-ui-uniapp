# 更新说明

本文件记录 `@jelly-kits/jelly-ui-uniapp` 每个版本**面向使用方**的变更，按版本倒序排列。

- 版本号与 npm 上的包、仓库里的 `vX.Y.Z` 标签一一对应。
- 发版时先在这里把「未发布」小节改成实际版本号，再执行 `npm version`（提交信息只会是版本号本身）。
- 分类沿用 Keep a Changelog 的口径：**新增 / 优化 / 修复 / 文档 / 工程**。
  「工程」是不影响使用方的内部改动，只想看组件用法可以跳过。

## 0.3.0

### 新增

- **`je-block-editor` + `je-block-view`**：块编辑器与只读渲染组件，与主库 `JeBlockEditor` /
  `JeBlockView` 同口径 —— 一段文本、一张图片、一个视频、一条超链接各占一块，每块占满一行、
  可拖动排序，数据是一份**不含 HTML 的纯 JSON**（`{ version, blocks }`），其他端按 `type`
  分支渲染即可，`je-block-view` 就是展示侧的参照实现。
  - **交互**：块平时只是一份预览，**点一下才选中**（高亮边框），选中后块头部才出现图标
    —— 拖动把手 + 编辑 / 上移 / 下移 / 复制 / 删除；点「编辑」打开**居中弹窗**改这个块，
    改完点确定才写回数据；从顶部操作栏添加新块时会自动选中并直接打开它的编辑窗口。
  - **上传**：传 `upload` 回调后图片 / 视频都能上传（不传则只能填地址）；
    **图片支持一次选多张** —— 第一张落在当前块，其余各生成一个图片块插在它后面。
  - **视频是点播的**：视频块默认只渲染封面（`poster`）+ 播放键，播放器根本不挂载，
    点了播放键才创建并自动播放，页面加载时一字节视频数据都不拉；
    没填封面图时是一块深色占位 + 播放键。
  - **尺寸**：可调宽度（25% / 50% / 75% / 100% 档位，或自定义数值 + `%` / `px` 单位）、
    高度（留空即自适应）与缩放方式（`contain` / `cover` / `fill`，端上落到 `<image>` 的
    `mode` 与 `<video>` 的 `object-fit`；`contain` 是默认值，不写进 JSON）。
  - **可配置**：`blockTypes` 限定可添加的块类型；`toolbar` 与 `blockActions` 都是
    「白名单 + 顺序 + 自定义按钮」，回调里能拿到块与下标，也可以调 `openEditor` 复用内置编辑窗口。
  - 其余属性：`placeholder`、`disabled`；事件：`change` / `upload-error` / `link-click`；
    可调用函数：`getDocument()` / `addBlock()` / `openEditor()` / `clear()`。
- **`je-icon` 新增 `video`、`text` 两个图标**（供块编辑器使用）。

### 优化

- **库自带的界面文案改走语言包**：`确定` / `取消` / `加载中` 这类固定文案以前是写死的，
  切到英文后依然是中文；现在统一从语言包取值，语言包也补了顶层 `close`（关闭）与 `empty`（暂无数据）。
  - 按钮：`je-dialog` / `je-action-sheet` / `je-area` / `je-picker` / `je-popconfirm` 的确定与取消、
    `je-search` 的取消、`je-share-sheet` 的「分享到」与取消；
    命令式 `showDialog` 的默认按钮文案跟随应用级语言配置。
  - 提示：`je-auto-complete` / `je-infinite-scroll` / `je-pull-refresh` 的加载中提示；
    空态：`je-empty` / `je-table` / `je-tree`。
  - 无障碍标签：`je-dialog` / `je-drawer` / `je-popup` / `je-image` / `je-alert` / `je-message` /
    `je-notification` / `je-notice-bar` / `je-floating-panel` / `je-tag` 的关闭按钮 `aria-label`。
  - 组件上同名的 prop（`cancelText` / `confirmText` / `loadingText` / `emptyText` 等）仍然优先，
    不传时才回退语言包，行为与之前一致。

### 文档

- `je-locale` 语言包新增顶层 `close`（关闭）与 `empty`（暂无数据）两条通用文案。
- **目录页新增「块编辑器」入口与演示页**：基础用法、多图上传与尺寸缩放、只读渲染、
  自定义按钮与按钮配置、限制块类型与禁用。
- `je-locale` 语言包新增 `block` 分组（块编辑器与只读渲染的文案，中英各一套）。

## 0.2.0

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
