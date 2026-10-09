import type { InjectionKey, Ref } from 'vue'

export type JeFormTrigger = 'blur' | 'change'

export interface JeFormRule {
  /** 必填校验 */
  required?: boolean
  /** 校验失败时的提示；不传则用内置文案 */
  message?: string
  /** 数字比大小，字符串 / 数组比长度 */
  min?: number
  max?: number
  /** 精确长度（字符串 / 数组） */
  len?: number
  /** 正则校验 */
  pattern?: RegExp
  /** 触发时机，默认同时挂在 blur 与 change 上 */
  trigger?: JeFormTrigger | JeFormTrigger[]
  /** 自定义校验，返回字符串表示失败原因 */
  validator?: (
    value: unknown,
    model: Record<string, unknown>,
  ) => string | void | Promise<string | void>
}

export type JeFormRules = Record<string, JeFormRule[]>

export type JeFormLabelPosition = 'top' | 'left' | 'right'

export interface JeFieldContext {
  prop: string
  /** 返回错误文案，null 表示通过 */
  validate: (trigger?: JeFormTrigger) => Promise<string | null>
  clearValidate: () => void
  /** 把字段值恢复成表单初始值 */
  reset: () => void
}

export interface JeFormContext {
  model: Record<string, unknown>
  /** 初始化时的模型快照，resetFields 用它回滚 */
  initialModel: Record<string, unknown>
  rules: JeFormRules
  labelPosition: Ref<JeFormLabelPosition>
  labelWidth: Ref<string>
  disabled: Ref<boolean>
  addField: (field: JeFieldContext) => void
  removeField: (field: JeFieldContext) => void
}

export const jeFormContextKey: InjectionKey<JeFormContext> = Symbol('jeForm')
export const jeFieldContextKey: InjectionKey<JeFieldContext> = Symbol('jeField')

/** 读取 `a.b.c` 形式的字段值 */
export function getValueByPath(model: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, model)
}

/** 写入 `a.b.c` 形式的字段值，中间层级不存在时自动补齐 */
export function setValueByPath(
  model: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.')
  const last = keys.pop()
  if (!last) return
  const target = keys.reduce<Record<string, unknown>>((acc, key) => {
    const next = acc[key]
    if (next && typeof next === 'object') return next as Record<string, unknown>
    const created: Record<string, unknown> = {}
    acc[key] = created
    return created
  }, model)
  target[last] = value
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** 数字取自身，其余类型取长度 */
function measure(value: unknown): number {
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.length
  return String(value).length
}

/** 跑单条规则，返回错误文案（null 表示通过） */
export async function runRule(
  rule: JeFormRule,
  value: unknown,
  model: Record<string, unknown>,
): Promise<string | null> {
  const empty = isEmpty(value)

  if (rule.required && empty) return rule.message ?? '该字段为必填项'

  if (!empty) {
    const size = measure(value)
    if (rule.len !== undefined && size !== rule.len) {
      return rule.message ?? `长度需为 ${rule.len}`
    }
    if (rule.min !== undefined && size < rule.min) {
      return rule.message ?? (typeof value === 'number' ? `不能小于 ${rule.min}` : `长度不能少于 ${rule.min}`)
    }
    if (rule.max !== undefined && size > rule.max) {
      return rule.message ?? (typeof value === 'number' ? `不能大于 ${rule.max}` : `长度不能超过 ${rule.max}`)
    }
    if (rule.pattern && !rule.pattern.test(String(value))) {
      return rule.message ?? '格式不正确'
    }
  }

  if (rule.validator) {
    const result = await rule.validator(value, model)
    if (typeof result === 'string' && result) return result
  }

  return null
}

/** 规则是否在指定触发时机生效（未声明 trigger 视为两者都生效） */
export function matchTrigger(rule: JeFormRule, trigger?: JeFormTrigger): boolean {
  if (!trigger) return true
  if (!rule.trigger) return true
  const list = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger]
  return list.includes(trigger)
}
