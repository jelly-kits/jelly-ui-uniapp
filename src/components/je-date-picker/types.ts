/** 日期选择器的形态：单个日期 / 日期时间 / 日期区间 */
export type JeDatePickerType = 'date' | 'datetime' | 'daterange'

/** 单值形态的绑定值 */
export type JeDatePickerValue = Date | string | null

/** 区间形态：[起点, 终点]，只选了起点时终点为 null */
export type JeDateRangeValue = [Date | string | null, Date | string | null]

export type JeDatePickerModelValue = JeDatePickerValue | JeDateRangeValue

/* 以下为纯函数日期工具，不依赖任何第三方库 */

const pad = (value: number) => String(value).padStart(2, '0')

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 用 format 里的占位符（YYYY / MM / DD / HH / mm / ss）把 Date 拼成字符串 */
export function formatDate(date: Date, format: string): string {
  const parts: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  }
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => parts[token] ?? token)
}

/** 按 format 解析字符串，格式不符或日期非法（如 2 月 30 日）时返回 null */
export function parseDate(value: string, format: string): Date | null {
  const tokens: string[] = []
  const regexp = /YYYY|MM|DD|HH|mm|ss/g
  let pattern = ''
  let last = 0
  let match = regexp.exec(format)

  while (match !== null) {
    pattern += escapeRegExp(format.slice(last, match.index))
    tokens.push(match[0])
    pattern += '(\\d{1,4})'
    last = match.index + match[0].length
    match = regexp.exec(format)
  }
  pattern += escapeRegExp(format.slice(last))

  const result = new RegExp(`^${pattern}$`).exec(value.trim())
  if (!result) return null

  const parts: Record<string, number> = {}
  tokens.forEach((token, index) => {
    parts[token] = Number(result[index + 1])
  })

  const year = parts.YYYY ?? 1970
  const month = (parts.MM ?? 1) - 1
  const day = parts.DD ?? 1
  const date = new Date(year, month, day, parts.HH ?? 0, parts.mm ?? 0, parts.ss ?? 0)

  // Date 会把越界日期归一化，这里用回读校验挡掉
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getDaysInMonth(year: number, month: number): number {
  // 下个月的第 0 天 = 本月最后一天
  return new Date(year, month + 1, 0).getDate()
}

/** 加 / 减月份，遇到 1 月 31 日这类越界日期时收缩到当月最后一天 */
export function addMonths(date: Date, amount: number): Date {
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const max = getDaysInMonth(target.getFullYear(), target.getMonth())
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, max))
}
