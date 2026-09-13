import { describe, expect, it, vi } from 'vitest'

import API_VIDEO from '~/background/messageListeners/api/video'
import { cloneHeaders, serializeParams } from '~/background/utils'
import type { Item as WebRecommendationItem } from '~/models/video/forYou'
import { isUsableWebRecommendationItem } from '~/utils/recommendation'

vi.mock('webextension-polyfill', () => ({
  default: {},
}))

const validRecommendation = {
  id: 1,
  bvid: 'BV1test',
  cid: 2,
  goto: 'av',
  owner: { mid: 3, name: 'UP', face: 'face.jpg' },
  stat: { view: 4, like: 5, danmaku: 6, vt: 0 },
} as WebRecommendationItem

describe('current Bilibili recommendation API contract', () => {
  it('uses the current WBI V8 homepage feed endpoint', () => {
    expect(API_VIDEO.getRecommendVideos.url).toBe(
      'https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd',
    )
    expect(API_VIDEO.getRecommendVideos.params).toMatchObject({
      fresh_type: 4,
      feed_version: 'V8',
      homepage_ver: 1,
      fresh_idx: 1,
    })
    expect(API_VIDEO.getRecommendVideos.params).not.toHaveProperty('plat')
  })

  it('serializes falsy query values without dropping them', () => {
    expect(serializeParams({ zero: 0, disabled: false, empty: '', missing: undefined, nullable: null }))
      .toBe('zero=0&disabled=false&empty=')
  })

  it('clones request headers before per-request mutation', () => {
    const original = { Accept: 'application/json' }
    const first = cloneHeaders(original)
    const second = cloneHeaders(original)

    first.Cookie = 'account-a'

    expect(second).toEqual(original)
    expect(original).toEqual({ Accept: 'application/json' })
  })

  it('rejects ad cards and cards missing fields required by the renderer', () => {
    expect(isUsableWebRecommendationItem(validRecommendation)).toBe(true)
    expect(isUsableWebRecommendationItem({
      ...validRecommendation,
      goto: 'ad',
    } as WebRecommendationItem)).toBe(false)
    expect(isUsableWebRecommendationItem({
      ...validRecommendation,
      owner: null,
    } as unknown as WebRecommendationItem)).toBe(false)
    expect(isUsableWebRecommendationItem({
      ...validRecommendation,
      stat: null,
    } as unknown as WebRecommendationItem)).toBe(false)
  })
})
