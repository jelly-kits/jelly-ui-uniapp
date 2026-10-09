/**
 * 演示页首页（组件宫格目录）的数据源。
 *
 * title 是组件的展示名，也是详情页顶栏标题；route 是详情页的路径片段，
 * 对应 src/pages/demo/<route>.vue（pages.json 里注册为 pages/demo/<route>）。
 * 两者一一对应，改 title 时要同步改对应页面里的 <text class="doc__title">。
 *
 * icon 是宫格上显示的图标名，取自 JeIcon 的图标集，纯装饰、可随时换。
 *
 * desc 是一句话说明，宫格卡片与 H5 文档站中间栏都用它，改这里两端同时生效。
 *
 * 分组取自主库 demo/router.ts：主库是「桌面 + 移动」双体系，所以单列了「移动端」；
 * uni 端整个库都是移动端，这个组名没有信息量，已按语义并入各分组。
 */
import type { JeIconName } from '../../components/je-icon/icons'

/** 一个组件条目：标题 + 详情页路由 + 宫格图标 + 一句话说明 */
export interface DemoSectionItem {
  /** 组件展示名，与详情页顶栏标题一致 */
  title: string
  /** 详情页路径片段：pages/demo/<route> */
  route: string
  /** 宫格里显示的图标 */
  icon: JeIconName
  /** 一句话说明：这个组件解决什么问题、能做什么 */
  desc: string
}

/** 目录分组：组内是各组件条目 */
export interface DemoSectionGroup {
  /** 分组标题 */
  title: string
  /** 组内的组件条目 */
  items: DemoSectionItem[]
}

/** 分组顺序即首页顺序，调整顺序只改这个数组 */
export const sectionGroups: DemoSectionGroup[] = [
  {
    title: '基础',
    items: [
      {
        title: '按钮',
        route: 'button',
        icon: 'circle-plus',
        desc: '触发操作的基础控件，支持多种语义色、尺寸与果冻回弹动效。',
      },
      {
        title: '文本',
        route: 'text',
        icon: 'align-left',
        desc: '用语义色与截断能力包裹文本，统一排版与省略行为。',
      },
      {
        title: '标签与徽标',
        route: 'tag-badge',
        icon: 'tag',
        desc: '用小标记标注分类与状态，或在元素角标上提示数量。',
      },
      {
        title: '图片',
        route: 'image',
        icon: 'image',
        desc: '支持圆角、懒加载与多种填充方式的图片容器。',
      },
      {
        title: '水印',
        route: 'watermark',
        icon: 'copy',
        desc: '在内容上平铺文字或图片水印，用于版权标注与防截图。',
      },
    ],
  },
  {
    title: '布局',
    items: [
      {
        title: '布局容器',
        route: 'container',
        icon: 'layers',
        desc: '上中下、左右分栏的页面骨架容器。',
      },
      {
        title: '栅格',
        route: 'layout-grid',
        icon: 'grid',
        desc: '24 栅格的行列布局，支持响应式断点与间距。',
      },
      {
        title: '分割面板',
        route: 'splitter',
        icon: 'maximize',
        desc: '可拖拽调整两侧大小的双栏面板。',
      },
      {
        title: '自定义滚动条',
        route: 'scrollbar',
        icon: 'arrow-up-down',
        desc: '隐藏原生滚动条，换成可定制的细滚动条。',
      },
    ],
  },
  {
    title: '表单',
    items: [
      {
        title: '输入',
        route: 'search',
        icon: 'edit',
        desc: '带搜索按钮与清空能力的搜索框。',
      },
      {
        title: '输入框',
        route: 'input',
        icon: 'terminal',
        desc: '单行文本输入，支持前后缀、清空与字数统计。',
      },
      {
        title: '密码输入框',
        route: 'password-input',
        icon: 'lock',
        desc: '带圆点遮罩与自定义键盘的支付级密码输入。',
      },
      {
        title: '数字键盘',
        route: 'number-keyboard',
        icon: 'backspace',
        desc: '为密码、金额等场景调起的自定义数字键盘。',
      },
      {
        title: '表单校验',
        route: 'form',
        icon: 'check',
        desc: '收集、校验并提交表单项，支持规则与错误提示。',
      },
      {
        title: '复选框 / 单选框',
        route: 'checkbox-radio',
        icon: 'circle',
        desc: '在一组选项中多选或单选。',
      },
      {
        title: '开关与分段',
        route: 'switch-segmented',
        icon: 'settings',
        desc: '布尔开关，以及少量选项之间的分段切换。',
      },
      {
        title: '步进器与评分',
        route: 'stepper-rate',
        icon: 'star',
        desc: '数值的加减步进与星级打分。',
      },
      {
        title: '滑块',
        route: 'slider',
        icon: 'minus',
        desc: '拖动滑块在区间内取值。',
      },
      {
        title: '下拉选择',
        route: 'select',
        icon: 'chevron-down',
        desc: '从浮层选项中挑选一个或多个值。',
      },
      {
        title: '滚轮选择器',
        route: 'picker',
        icon: 'arrow-up-down',
        desc: '底部弹出的多列滚轮选择器。',
      },
      {
        title: '省市区选择',
        route: 'area',
        icon: 'map-pin',
        desc: '基于内置行政区划数据的三级联动选择。',
      },
      {
        title: '时间选择',
        route: 'time-picker',
        icon: 'clock',
        desc: '时分秒的滚轮输入。',
      },
      {
        title: '时间下拉',
        route: 'time-select',
        icon: 'inbox',
        desc: '按固定步长列出可选时间点的下拉选择。',
      },
      {
        title: '日期选择',
        route: 'date-picker',
        icon: 'calendar',
        desc: '单日、多日或日期区间的日历选择。',
      },
      {
        title: '级联选择',
        route: 'cascader',
        icon: 'chevrons-right',
        desc: '按层级逐级展开的联动选择。',
      },
      {
        title: '自动补全',
        route: 'auto-complete',
        icon: 'search',
        desc: '输入时联想并补全候选内容。',
      },
      {
        title: '颜色选择',
        route: 'color-picker',
        icon: 'target',
        desc: '取色面板与预定义色板。',
      },
      {
        title: '穿梭框',
        route: 'transfer',
        icon: 'arrow-right',
        desc: '在两栏之间勾选并移动条目。',
      },
      {
        title: '树形选择',
        route: 'tree-select',
        icon: 'folder',
        desc: '以下拉浮层承载树形结构的单选或多选。',
      },
      {
        title: '上传',
        route: 'upload',
        icon: 'upload',
        desc: '选择、预览并管理本地文件的上传控件。',
      },
      {
        title: '手写签名',
        route: 'signature',
        icon: 'edit',
        desc: '在画布上手指签名并导出图片。',
      },
    ],
  },
  {
    title: '数据展示',
    items: [
      {
        title: '单元格',
        route: 'cell',
        icon: 'list',
        desc: '列表行的基础单元，承载标题、描述与右侧内容。',
      },
      {
        title: '滑动单元格',
        route: 'swipe-cell',
        icon: 'arrow-left',
        desc: '左滑露出操作按钮的单元格。',
      },
      {
        title: '折叠面板',
        route: 'collapse',
        icon: 'chevron-down',
        desc: '点击标题展开或收起内容区域。',
      },
      {
        title: '时间线',
        route: 'timeline',
        icon: 'clock',
        desc: '按时间顺序排列的节点流。',
      },
      {
        title: '描述列表',
        route: 'descriptions',
        icon: 'file',
        desc: '以键值对形式成组展示字段。',
      },
      {
        title: '统计数值',
        route: 'statistic',
        icon: 'chart',
        desc: '展示带千分位、精度与前缀后缀的数值。',
      },
      {
        title: '倒计时',
        route: 'count-down',
        icon: 'clock',
        desc: '按目标时间倒数，支持暂停与重置。',
      },
      {
        title: '轮播',
        route: 'carousel',
        icon: 'play',
        desc: '循环播放一组图片或内容。',
      },
      {
        title: '宫格',
        route: 'grid',
        icon: 'grid',
        desc: '等分的图标宫格，常用作首页快捷入口。',
      },
      {
        title: '日历',
        route: 'calendar',
        icon: 'calendar',
        desc: '月历面板，支持日期选择与标记。',
      },
      {
        title: '树形控件',
        route: 'tree',
        icon: 'folder',
        desc: '展示层级数据，支持展开与勾选。',
      },
      {
        title: '组织架构',
        route: 'org-chart',
        icon: 'share',
        desc: '用连线图展示上下级关系。',
      },
      {
        title: '二维码',
        route: 'qrcode',
        icon: 'maximize',
        desc: '把文本或链接渲染成二维码。',
      },
      {
        title: '海报',
        route: 'poster',
        icon: 'image',
        desc: '组合二维码与图文，生成可保存的分享海报。',
      },
      {
        title: '优惠券',
        route: 'coupon',
        icon: 'tag',
        desc: '展示面额、有效期与使用状态的票券卡片。',
      },
      {
        title: '地址列表',
        route: 'address-list',
        icon: 'map-pin',
        desc: '收货地址的展示、切换与增删改。',
      },
      {
        title: '表格',
        route: 'table',
        icon: 'grid',
        desc: '展示结构化数据，支持固定列与两种展现形态。',
      },
      {
        title: '表格 · 卡片形态',
        route: 'table-card',
        icon: 'list',
        desc: '窄屏下以卡片方式逐条展示表格数据。',
      },
      {
        title: '表格 · 表格形态',
        route: 'table-grid',
        icon: 'grid',
        desc: '保留列头、可横向滚动的表格形态。',
      },
      {
        title: '懒加载图片',
        route: 'lazyload',
        icon: 'image',
        desc: '进入可视区域后才真正加载的图片。',
      },
    ],
  },
  {
    title: '导航',
    items: [
      {
        title: '步骤条',
        route: 'steps',
        icon: 'trending-up',
        desc: '展示流程进度与各步骤的状态。',
      },
      {
        title: '面包屑',
        route: 'breadcrumb',
        icon: 'chevrons-right',
        desc: '展示当前页面在层级中的位置。',
      },
      {
        title: '标签页',
        route: 'tabs',
        icon: 'menu',
        desc: '在同级内容之间切换。',
      },
      {
        title: '可关闭标签页',
        route: 'tabs-editable',
        icon: 'close',
        desc: '支持新增与关闭的标签页。',
      },
      {
        title: '可滑动标签页',
        route: 'tab-swipe',
        icon: 'menu',
        desc: '内容区可左右滑动切换的标签页。',
      },
      {
        title: '顶部导航 / 底部导航',
        route: 'nav-bar-tabbar',
        icon: 'menu',
        desc: '页面顶栏与底部标签栏。',
      },
      {
        title: '导航菜单',
        route: 'menu',
        icon: 'menu',
        desc: '可展开的纵向层级菜单。',
      },
      {
        title: '索引栏',
        route: 'index-bar',
        icon: 'list',
        desc: '右侧字母索引，点击快速定位到分组。',
      },
      {
        title: '侧边导航',
        route: 'sidebar',
        icon: 'menu',
        desc: '竖向排列的标签，常与内容区联动。',
      },
      {
        title: '分页',
        route: 'pagination',
        icon: 'chevrons-left',
        desc: '切换页码与每页条数。',
      },
      {
        title: '下拉菜单',
        route: 'dropdown',
        icon: 'chevron-down',
        desc: '点击触发器向下弹出的菜单。',
      },
      {
        title: '下拉菜单栏',
        route: 'dropdown-menu',
        icon: 'filter',
        desc: '顶部横向排列的下拉筛选栏。',
      },
      {
        title: '锚点',
        route: 'anchor',
        icon: 'link',
        desc: '滚动时高亮当前区块，点击可跳转。',
      },
      {
        title: '固钉',
        route: 'affix',
        icon: 'map-pin',
        desc: '滚动到阈值后把元素固定在视口。',
      },
      {
        title: '回到顶部',
        route: 'backtop',
        icon: 'arrow-up',
        desc: '滚动一定距离后出现，点击回到页首。',
      },
      {
        title: '操作栏',
        route: 'action-bar',
        icon: 'more',
        desc: '页面底部的「图标 + 按钮」操作栏。',
      },
      {
        title: '提交栏',
        route: 'submit-bar',
        icon: 'check',
        desc: '底部展示合计金额与提交按钮的结算栏。',
      },
    ],
  },
  {
    title: '反馈',
    items: [
      {
        title: '加载',
        route: 'loading',
        icon: 'loading',
        desc: '加载中的转圈指示器，也可自定义内容。',
      },
      {
        title: '下拉刷新',
        route: 'pull-refresh',
        icon: 'refresh',
        desc: '下拉触发刷新，配合滚动容器使用。',
      },
      {
        title: '无限滚动',
        route: 'infinite-scroll',
        icon: 'arrow-down',
        desc: '滚动到底部时自动加载更多。',
      },
      {
        title: '提示与结果',
        route: 'alert-result',
        icon: 'info',
        desc: '页内提示条，以及操作完成后的结果页。',
      },
      {
        title: '进度条',
        route: 'progress',
        icon: 'target',
        desc: '横向展示进度百分比。',
      },
      {
        title: '环形进度',
        route: 'circle',
        icon: 'circle',
        desc: '以圆环展示进度，常用于仪表盘。',
      },
      {
        title: '骨架屏与反馈',
        route: 'skeleton',
        icon: 'layers',
        desc: '内容就绪前的占位骨架。',
      },
      {
        title: '空状态',
        route: 'empty',
        icon: 'inbox',
        desc: '数据为空时的图文占位。',
      },
      {
        title: '轻提示 / 通知',
        route: 'message-notification',
        icon: 'message',
        desc: '顶层弹出的轻提示与通知卡片。',
      },
      {
        title: '通知栏',
        route: 'notice-bar',
        icon: 'bell',
        desc: '页头循环滚动的公告条。',
      },
    ],
  },
  {
    title: '浮层',
    items: [
      {
        title: '弹出层',
        route: 'popup',
        icon: 'maximize',
        desc: '可从四个方向弹出的基础浮层，是其它浮层的底座。',
      },
      {
        title: '抽屉',
        route: 'drawer',
        icon: 'bookmark',
        desc: '从侧边滑出的面板。',
      },
      {
        title: '对话框',
        route: 'dialog',
        icon: 'message',
        desc: '居中的模态框，支持函数式调用。',
      },
      {
        title: '动作面板',
        route: 'action-sheet',
        icon: 'more-vertical',
        desc: '从底部弹出的动作列表。',
      },
      {
        title: '分享面板',
        route: 'share-sheet',
        icon: 'share',
        desc: '底部弹出的分享渠道网格。',
      },
      {
        title: '文字提示',
        route: 'tooltip',
        icon: 'question',
        desc: '长按或悬停时出现的气泡说明。',
      },
      {
        title: '气泡卡片',
        route: 'popover',
        icon: 'message',
        desc: '点击触发器展开的富内容浮层。',
      },
      {
        title: '气泡确认',
        route: 'popconfirm',
        icon: 'question',
        desc: '在气泡里完成的轻量二次确认。',
      },
      {
        title: '图片预览',
        route: 'image-preview',
        icon: 'eye',
        desc: '全屏查看图片，支持缩放与滑动切换。',
      },
      {
        title: '浮动面板',
        route: 'floating-panel',
        icon: 'layers',
        desc: '可拖拽、可吸附的底部面板。',
      },
      {
        title: '浮动气泡',
        route: 'floating-bubble',
        icon: 'dot',
        desc: '悬浮于内容之上的可拖拽快捷入口。',
      },
      {
        title: '漫游式引导',
        route: 'tour',
        icon: 'target',
        desc: '按步骤高亮页面元素的新手引导。',
      },
    ],
  },
  {
    title: '工程能力',
    items: [
      {
        title: '全局配置',
        route: 'config-provider',
        icon: 'settings',
        desc: '统一下发语言包、主题等全局配置。',
      },
      {
        title: '语言包',
        route: 'locale',
        icon: 'flag',
        desc: '内置 zh-CN / en-US 文案，支持注册自定义语言、扩展可翻译字段。',
      },
      {
        title: '主题',
        route: 'theme',
        icon: 'sun',
        desc: '明暗模式与自定义主题色。',
      },
    ],
  },
]

/** 拍平后的全部组件条目，供目录计数与路由生成使用 */
export const flatSections: DemoSectionItem[] = sectionGroups.reduce<DemoSectionItem[]>(
  (list, group) => list.concat(group.items),
  [],
)
