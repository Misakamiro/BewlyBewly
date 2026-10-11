/**
 * B 站 `level_info` 里的 `current_exp` 是账号**累计**经验,而不是"本等级内已获得经验"。
 * 等级进度必须减去 `current_min`(本等级起始经验)才是本等级内的真实进度:
 *
 *   (current_exp - current_min) / (next_exp - current_min)
 *
 * 直接用 `current_exp / next_exp` 会把进度算大——等级越高偏差越大
 * (Lv1 因为 current_min 为 0 而恰好正确,Lv2 以上开始偏)。
 * 满级(Lv6)时 `next_exp` 为 0,必须避免除零。
 */
export interface LevelInfoLike {
  current_level?: number
  current_min?: number
  current_exp?: number
  next_exp?: number
}

/**
 * 计算等级经验条宽度,返回 CSS 宽度字符串(如 `'37.50%'`)。
 * 数据缺失或异常(满级、区间非正、字段不是有限数)时回退为 `'0%'`,
 * 并把结果收敛到 0–100,避免异常数据把进度条撑出容器。
 */
export function getLevelProgressWidth(levelInfo?: LevelInfoLike | null): string {
  const { current_exp: currentExp, next_exp: nextExp, current_min: minExp } = levelInfo ?? {}

  if (typeof currentExp !== 'number' || !Number.isFinite(currentExp))
    return '0%'
  if (typeof nextExp !== 'number' || !Number.isFinite(nextExp))
    return '0%'

  // 缺 current_min 的旧数据回退为 0,与 Lv1 的语义一致
  const min = typeof minExp === 'number' && Number.isFinite(minExp) ? minExp : 0
  const totalExp = nextExp - min
  if (totalExp <= 0)
    return '0%'

  const percentage = ((currentExp - min) / totalExp) * 100
  if (!Number.isFinite(percentage))
    return '0%'

  return `${Math.min(100, Math.max(0, percentage)).toFixed(2)}%`
}
