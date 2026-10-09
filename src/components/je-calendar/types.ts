/** 日历单元格的派生状态，供默认渲染与 date-cell 插槽使用 */
export interface JeCalendarCell {
  date: Date
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  inRange: boolean
}

/** date-cell 插槽的作用域参数 */
export interface JeCalendarCellSlotProps {
  date: Date
  data: JeCalendarCell
}

/* 以下为纯函数日期工具，不依赖任何第三方库 */

const pad = (value: number) => String(value).padStart(2, '0')

/** 用 format 里的占位符（YYYY / MM / DD）把 Date 拼成字符串 */
export function formatDate(date: Date, format: string): string {
  const parts: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
  }
  return format.replace(/YYYY|MM|DD/g, (token) => parts[token] ?? token)
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

/** 加减月份，遇到 1 月 31 日这类越界日期时收缩到当月最后一天 */
export function addMonths(date: Date, amount: number): Date {
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const max = getDaysInMonth(target.getFullYear(), target.getMonth())
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, max))
}
