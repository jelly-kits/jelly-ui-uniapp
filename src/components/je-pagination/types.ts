/** 页码折叠结果：数字为真实页码，其余两个是省略号占位 */
export type JePagerItem = number | 'prev-ellipsis' | 'next-ellipsis'

/**
 * 计算页码列表（纯函数）。
 * 首尾页永远保留，中间按当前页滑动，必要时用省略号占位，
 * 返回的项数不会超过 pagerCount。
 */
export function buildPager(
  current: number,
  pageCount: number,
  pagerCount: number,
): JePagerItem[] {
  const pageTotal = Math.max(1, Math.floor(pageCount))
  // pagerCount 至少 5，且取奇数，保证窗口左右对称
  const raw = Math.max(5, Math.floor(pagerCount))
  const count = raw % 2 === 0 ? raw + 1 : raw

  if (pageTotal <= count) {
    return Array.from({ length: pageTotal }, (_, index) => index + 1)
  }

  const half = Math.floor(count / 2)
  const page = Math.min(Math.max(1, Math.floor(current)), pageTotal)

  let start: number
  let end: number
  if (page <= half) {
    // 靠近首页：右侧留一个省略号
    start = 2
    end = count - 2
  } else if (page > pageTotal - half) {
    // 靠近尾页：左侧留一个省略号
    start = pageTotal - (count - 3)
    end = pageTotal - 1
  } else {
    // 居中：两侧各一个省略号，中间窗口收窄一格
    start = page - 1
    end = page + 1
  }

  const items: JePagerItem[] = [1]
  if (start > 2) items.push('prev-ellipsis')
  for (let index = start; index <= end; index += 1) items.push(index)
  if (end < pageTotal - 1) items.push('next-ellipsis')
  items.push(pageTotal)
  return items
}
