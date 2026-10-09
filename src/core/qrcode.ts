/**
 * 二维码（QR Code）编码内核 —— 纯 TypeScript 实现，零运行时依赖。
 *
 * 口径：
 * - 只做**字节模式**（UTF-8），涵盖 URL、中文等任意文本；数字 / 字母数字模式未做容量
 *   压缩优化（同一内容可能比标准库多占一点码字、影响版本号，但不影响可扫性）。
 * - 输出与渲染方式无关的 `boolean[][]` 矩阵（true = 深色模块），SVG / Canvas 渲染层共用。
 * - 遵循 ISO/IEC 18004：GF(256) 上的 Reed-Solomon 纠错、版本 1–40、L/M/Q/H 四级纠错、
 *   8 种掩码按罚分选优、格式信息与版本信息用 BCH 码。
 *
 * 与主库 `src/core/qrcode.ts` 完全同源（纯计算，不含任何 DOM / 平台 API）。
 */

/** 纠错级别：L ≈7% / M ≈15% / Q ≈25% / H ≈30% 的码字可被恢复 */
export type JeQrcodeLevel = 'L' | 'M' | 'Q' | 'H'

export interface JeQrcodeEncodeOptions {
  /** 要编码的文本（按 UTF-8 字节模式） */
  value: string
  /** 纠错级别，默认 M */
  level?: JeQrcodeLevel
  /** 最小版本 1–40，默认 1 */
  minVersion?: number
  /** 最大版本 1–40，默认 40；内容超出该版本容量时返回 null */
  maxVersion?: number
}

export interface JeQrcodeEncodeResult {
  /** 版本号 1–40 */
  version: number
  /** 实际使用的纠错级别 */
  level: JeQrcodeLevel
  /** 选中的掩码编号 0–7 */
  mask: number
  /** 边长（模块数）= 17 + version * 4 */
  size: number
  /** 模块矩阵，matrix[y][x]，true = 深色 */
  matrix: boolean[][]
  /**
   * 功能模块标记，isFunction[y][x]，true = 定位 / 校正 / 定时 / 格式等结构模块。
   * 形状渲染用得上：结构模块保持方块（尤其三个定位图案，点状化会破坏 1:1:3:1:1 比例）。
   */
  isFunction: boolean[][]
}

const LEVEL_INDEX: Record<JeQrcodeLevel, number> = { L: 0, M: 1, Q: 2, H: 3 }
/** 格式信息里的纠错级别编码（注意与内部行序不同） */
const LEVEL_FORMAT_BITS: Record<JeQrcodeLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

/** 每个纠错块附加的纠错码字数：ECC_CODEWORDS_PER_BLOCK[level][version]（下标 0 占位） */
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  // 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39  40
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
]

/** 纠错块数量：NUM_ERROR_CORRECTION_BLOCKS[level][version]（下标 0 占位） */
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // L
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // H
]

const PENALTY_N1 = 3
const PENALTY_N2 = 3
const PENALTY_N3 = 40
const PENALTY_N4 = 10

/** 取 x 的第 i 位（低位为 0），结果是布尔 */
const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0

/** 版本对应的数据模块总数（不含功能图案与格式/版本信息占位） */
function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (version >= 7) result -= 36
  }
  return result
}

/** 版本 + 纠错级别下可用于数据的码字数 */
function getNumDataCodewords(version: number, level: JeQrcodeLevel): number {
  const row = LEVEL_INDEX[level]
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[row][version] * NUM_ERROR_CORRECTION_BLOCKS[row][version]
  )
}

/** GF(256) 乘法，本原多项式 0x11D */
function gfMultiply(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}

/** 生成 degree 次的 Reed-Solomon 生成多项式（按次数降幂排列的系数） */
function reedSolomonComputeDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMultiply(root, 0x02)
  }
  return result
}

/** 计算 data 除以生成多项式的余数（即纠错码字） */
function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMultiply(divisor[i], factor)
    }
  }
  return result
}

/** 追加纠错码字并按块交织，得到最终码字序列（长度 = rawCodewords） */
function addEccAndInterleave(data: number[], version: number, level: JeQrcodeLevel): number[] {
  const row = LEVEL_INDEX[level]
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[row][version]
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[row][version]
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8)
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  const shortBlockLen = Math.floor(rawCodewords / numBlocks)

  const blocks: number[][] = []
  const rsDivisor = reedSolomonComputeDivisor(blockEccLen)
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const len = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1)
    const dat = data.slice(k, k + len)
    k += len
    const ecc = reedSolomonComputeRemainder(dat, rsDivisor)
    // 短块补一个占位字节，使所有块等长，以便按列交织
    if (i < numShortBlocks) dat.push(0)
    blocks.push(dat.concat(ecc))
  }

  const result: number[] = []
  const padPos = shortBlockLen - blockEccLen
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      // 跳过短块里那个占位字节
      if (i !== padPos || j >= numShortBlocks) result.push(blocks[j][i])
    }
  }
  return result
}

/** 把文本按 UTF-8 编成字节数组 */
function toUtf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text))
  // 极老环境兜底：逐字符手动编码（覆盖 BMP 与代理对）
  const bytes: number[] = []
  for (const ch of text) {
    let code = ch.codePointAt(0) as number
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000)
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
      code = 0
    }
  }
  return bytes
}

/** 位缓冲：按位追加并按字节取出 */
class BitBuffer {
  private bits: number[] = []

  get length(): number {
    return this.bits.length
  }

  appendBits(value: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1)
  }

  toBytes(): number[] {
    const bytes: number[] = []
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] ?? 0)
      bytes.push(byte)
    }
    return bytes
  }
}

/** 生成数据码字（字节模式：模式指示符 → 字符计数 → 数据 → 终止符 → 填充） */
function makeDataCodewords(bytes: number[], version: number, level: JeQrcodeLevel): number[] {
  const ccBits = version <= 9 ? 8 : 16
  const capacityBits = getNumDataCodewords(version, level) * 8

  const bb = new BitBuffer()
  bb.appendBits(0b0100, 4) // 字节模式
  bb.appendBits(bytes.length, ccBits)
  for (const b of bytes) bb.appendBits(b, 8)

  // 终止符最多 4 位
  bb.appendBits(0, Math.min(4, capacityBits - bb.length))
  // 补齐到字节边界
  bb.appendBits(0, (8 - (bb.length % 8)) % 8)
  // 交替填充 0xEC / 0x11
  for (let pad = 0xec; bb.length < capacityBits; pad ^= 0xec ^ 0x11) bb.appendBits(pad, 8)
  return bb.toBytes()
}

/** 对齐图案的中心坐标列表 */
function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return []
  const numAlign = Math.floor(version / 7) + 2
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result: number[] = [6]
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

/** 构建「功能图案已就位、数据待填」的矩阵（含占位格式信息） */
function buildFunctionPatterns(version: number) {
  const size = version * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  )

  const setFunctionModule = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark
    isFunction[y][x] = true
  }

  // 定时图案
  for (let i = 0; i < size; i++) {
    setFunctionModule(6, i, i % 2 === 0)
    setFunctionModule(i, 6, i % 2 === 0)
  }

  // 定位图案（含分隔带）
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < size && y >= 0 && y < size) {
          setFunctionModule(x, y, dist !== 2 && dist !== 4)
        }
      }
    }
  }
  drawFinder(3, 3)
  drawFinder(size - 4, 3)
  drawFinder(3, size - 4)

  // 预留格式信息区与暗模块（具体深浅由 drawFormatBits 写入）——
  // 必须在数据填充之前标记，否则数据位会被写进这些格子、随后被格式信息覆盖而错位。
  // 用「未标记才占位」的方式，避免覆盖已就位的定时图案（如 (8,6) / (6,8)）。
  const reserve = (x: number, y: number) => {
    if (!isFunction[y][x]) setFunctionModule(x, y, false)
  }
  for (let y = 0; y <= 8; y++) reserve(8, y)
  for (let x = 0; x <= 8; x++) reserve(x, 8)
  for (let i = 0; i < 8; i++) reserve(size - 1 - i, 8)
  for (let i = 8; i < 15; i++) reserve(8, size - 15 + i)
  reserve(8, size - 8)

  // 校正图案
  const alignPos = getAlignmentPatternPositions(version)
  const numAlign = alignPos.length
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === numAlign - 1) ||
        (i === numAlign - 1 && j === 0)
      if (corner) continue
      const cx = alignPos[i]
      const cy = alignPos[j]
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
        }
      }
    }
  }

  return { size, modules, isFunction, setFunctionModule }
}

export function encodeQrcode(options: JeQrcodeEncodeOptions): JeQrcodeEncodeResult | null {
  const value = options.value ?? ''
  const level = options.level ?? 'M'
  const minVersion = Math.max(1, Math.min(40, options.minVersion ?? 1))
  const maxVersion = Math.max(minVersion, Math.min(40, options.maxVersion ?? 40))

  const bytes = toUtf8Bytes(value)

  // 选版本：字节模式开销 = 4(模式) + 字符计数位 + 8 * 字节数
  let version = minVersion
  let ccBits = 0
  for (;;) {
    if (version > maxVersion) return null
    ccBits = version <= 9 ? 8 : 16
    const capacityBits = getNumDataCodewords(version, level) * 8
    if (4 + ccBits + bytes.length * 8 <= capacityBits) break
    version++
  }

  const dataCodewords = makeDataCodewords(bytes, version, level)
  const allCodewords = addEccAndInterleave(dataCodewords, version, level)

  const { size, modules, isFunction, setFunctionModule } = buildFunctionPatterns(version)

  // 版本信息（版本 >= 7）
  if (version >= 7) {
    let rem = version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i)
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFunctionModule(a, b, bit)
      setFunctionModule(b, a, bit)
    }
  }

  // 填数据（从右下角开始 zigzag，跳过第 6 列定时图案）
  const dataBits = allCodewords.length * 8
  let bitIndex = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFunction[y][x] && bitIndex < dataBits) {
          const byte = allCodewords[bitIndex >>> 3]
          modules[y][x] = getBit(byte, 7 - (bitIndex & 7))
          bitIndex++
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFunction[y][x]) continue
        let invert: boolean
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0
            break
          case 1:
            invert = y % 2 === 0
            break
          case 2:
            invert = x % 3 === 0
            break
          case 3:
            invert = (x + y) % 3 === 0
            break
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
            break
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0
            break
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
            break
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
            break
        }
        if (invert) modules[y][x] = !modules[y][x]
      }
    }
  }

  const drawFormatBits = (mask: number) => {
    const data = (LEVEL_FORMAT_BITS[level] << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = (((data << 10) | rem) ^ 0x5412) & 0x7fff

    // 第一份（左上）
    for (let i = 0; i <= 5; i++) setFunctionModule(8, i, getBit(bits, i))
    setFunctionModule(8, 7, getBit(bits, 6))
    setFunctionModule(8, 8, getBit(bits, 7))
    setFunctionModule(7, 8, getBit(bits, 8))
    for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, getBit(bits, i))

    // 第二份（右上 + 左下）
    for (let i = 0; i < 8; i++) setFunctionModule(size - 1 - i, 8, getBit(bits, i))
    for (let i = 8; i < 15; i++) setFunctionModule(8, size - 15 + i, getBit(bits, i))
    // 固定的深色模块
    setFunctionModule(8, size - 8, true)
  }

  // 罚分：规则 1 / 2 / 3 / 4
  const finderPenaltyAddHistory = (runLength: number, history: number[]) => {
    let length = runLength
    if (history[0] === 0) length += size
    history.pop()
    history.unshift(length)
  }
  const finderPenaltyCountPatterns = (history: number[]): number => {
    const n = history[1]
    const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n
    return (
      (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
      (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
    )
  }
  const finderPenaltyTerminateAndCount = (runColor: boolean, runLength: number, history: number[]) => {
    let length = runLength
    if (runColor) {
      finderPenaltyAddHistory(length, history)
      length = 0
    }
    length += size
    finderPenaltyAddHistory(length, history)
    return finderPenaltyCountPatterns(history)
  }

  const getPenaltyScore = (): number => {
    let result = 0

    for (let y = 0; y < size; y++) {
      let runColor = false
      let runX = 0
      const history = [0, 0, 0, 0, 0, 0, 0]
      for (let x = 0; x < size; x++) {
        if (modules[y][x] === runColor) {
          runX++
          if (runX === 5) result += PENALTY_N1
          else if (runX > 5) result++
        } else {
          finderPenaltyAddHistory(runX, history)
          if (!runColor) result += finderPenaltyCountPatterns(history) * PENALTY_N3
          runColor = modules[y][x]
          runX = 1
        }
      }
      result += finderPenaltyTerminateAndCount(runColor, runX, history) * PENALTY_N3
    }

    for (let x = 0; x < size; x++) {
      let runColor = false
      let runY = 0
      const history = [0, 0, 0, 0, 0, 0, 0]
      for (let y = 0; y < size; y++) {
        if (modules[y][x] === runColor) {
          runY++
          if (runY === 5) result += PENALTY_N1
          else if (runY > 5) result++
        } else {
          finderPenaltyAddHistory(runY, history)
          if (!runColor) result += finderPenaltyCountPatterns(history) * PENALTY_N3
          runColor = modules[y][x]
          runY = 1
        }
      }
      result += finderPenaltyTerminateAndCount(runColor, runY, history) * PENALTY_N3
    }

    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = modules[y][x]
        if (
          color === modules[y][x + 1] &&
          color === modules[y + 1][x] &&
          color === modules[y + 1][x + 1]
        ) {
          result += PENALTY_N2
        }
      }
    }

    let dark = 0
    for (const row of modules) for (const cell of row) if (cell) dark++
    const total = size * size
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
    result += k * PENALTY_N4
    return result
  }

  let bestMask = 0
  let minPenalty = Infinity
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask)
    drawFormatBits(mask)
    const penalty = getPenaltyScore()
    if (penalty < minPenalty) {
      minPenalty = penalty
      bestMask = mask
    }
    applyMask(mask) // 撤销，试下一个
  }
  drawFormatBits(bestMask)
  applyMask(bestMask)

  const matrix = modules.map((row) => row.slice())
  return { version, level, mask: bestMask, size, matrix, isFunction }
}
