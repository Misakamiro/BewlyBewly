import { describe, expect, it } from 'vitest'

import { getLevelProgressWidth } from '~/utils/levelProgress'

describe('getLevelProgressWidth', () => {
  it('computes progress inside the current level, not against the cumulative exp', () => {
    // Lv3:1500 起,4500 升 Lv4,区间跨度 3000;账号累计 3000 → (3000-1500)/3000 = 50%
    // 旧实现 current_exp / next_exp = 3000/4500 = 66.67%,是本 bug 的特征值
    expect(getLevelProgressWidth({ current_level: 3, current_min: 1500, current_exp: 3000, next_exp: 4500 }))
      .toBe('50.00%')
  })

  it('matches the naive formula for Lv1 where current_min is 0', () => {
    expect(getLevelProgressWidth({ current_level: 1, current_min: 0, current_exp: 100, next_exp: 200 }))
      .toBe('50.00%')
  })

  it('returns 0% at the exact start of a level', () => {
    expect(getLevelProgressWidth({ current_min: 10800, current_exp: 10800, next_exp: 28800 }))
      .toBe('0.00%')
  })

  it('returns 0% for max level where next_exp is 0 (no division by zero)', () => {
    expect(getLevelProgressWidth({ current_level: 6, current_min: 28800, current_exp: 50000, next_exp: 0 }))
      .toBe('0%')
  })

  it('returns 0% when the level range is not positive', () => {
    expect(getLevelProgressWidth({ current_min: 4500, current_exp: 4500, next_exp: 4500 }))
      .toBe('0%')
  })

  it('falls back to 0 when current_min is missing', () => {
    expect(getLevelProgressWidth({ current_exp: 100, next_exp: 200 }))
      .toBe('50.00%')
  })

  it('returns 0% for missing, null or empty level info', () => {
    expect(getLevelProgressWidth()).toBe('0%')
    expect(getLevelProgressWidth(null)).toBe('0%')
    expect(getLevelProgressWidth({})).toBe('0%')
  })

  it('returns 0% for non-numeric or non-finite fields', () => {
    // B 站异常响应里可能缺字段或给 null / NaN
    expect(getLevelProgressWidth({ current_exp: null as unknown as number, next_exp: 200 })).toBe('0%')
    expect(getLevelProgressWidth({ current_exp: Number.NaN, next_exp: 200 })).toBe('0%')
    expect(getLevelProgressWidth({ current_exp: 100, next_exp: Number.POSITIVE_INFINITY })).toBe('0%')
  })

  it('clamps out-of-range results to 0-100', () => {
    // 累计经验超过 next_exp(数据异常)不应把宽度撑过容器
    expect(getLevelProgressWidth({ current_min: 1500, current_exp: 9999, next_exp: 4500 }))
      .toBe('100.00%')
    // 累计经验低于 current_min 时不应出现负宽度
    expect(getLevelProgressWidth({ current_min: 1500, current_exp: 10, next_exp: 4500 }))
      .toBe('0.00%')
  })
})
