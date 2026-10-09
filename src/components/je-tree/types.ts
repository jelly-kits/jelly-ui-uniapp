import type { InjectionKey, Ref } from 'vue'
import type { JeIconName } from '../je-icon/icons'

/** 树节点 */
export interface JeTreeNode {
  key: string | number
  label: string
  children?: JeTreeNode[]
  disabled?: boolean
  icon?: JeIconName
}

/**
 * 递归节点视图与根组件共享的状态 / 操作。
 * 通过 provide/inject 传递，深层节点不必层层透传 props。
 */
export interface JeTreeContext {
  /** 展开的 key 集合 */
  expandedKeys: Ref<Array<string | number>>
  /** 勾选的 key 集合（父子级联后） */
  checkedKeys: Ref<Array<string | number>>
  /** 选中的 key 集合（由 modelValue 派生） */
  selectedKeys: Ref<Array<string | number>>
  /** 键盘 roving tabindex 的当前节点 */
  activeKey: Ref<string | number | null>
  /** 是否展示勾选框 */
  checkable: Ref<boolean>
  isExpanded: (key: string | number) => boolean
  isChecked: (key: string | number) => boolean
  isSelected: (key: string | number) => boolean
  isActive: (key: string | number) => boolean
  /** 半选（部分子节点被勾选） */
  isIndeterminate: (node: JeTreeNode) => boolean
  hasChildren: (node: JeTreeNode) => boolean
  setActive: (key: string | number) => void
  toggleExpand: (node: JeTreeNode) => void
  toggleCheck: (node: JeTreeNode) => void
  /** 点击整行：按需展开 + 选中 */
  onNodeClick: (node: JeTreeNode) => void
}

export const jeTreeKey: InjectionKey<JeTreeContext> = Symbol('je-tree')
