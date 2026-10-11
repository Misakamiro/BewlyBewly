import { describe, expect, it, vi } from 'vitest'

import API_MOMENT from '~/background/messageListeners/api/moment'
import { apiListenerFactory } from '~/background/utils'

vi.mock('webextension-polyfill', () => {
  const api = { cookies: { getAll: vi.fn(async () => []) } }
  return { ...api, default: api }
})

const FEED_URL = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all'

async function requestUrlFor(message: Record<string, unknown>) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => ({ code: 0 }) }))
  vi.stubGlobal('fetch', fetchMock)

  const listener = apiListenerFactory(API_MOMENT)
  await listener({ contentScriptQuery: 'getMoments', ...message })

  const url = fetchMock.mock.calls[0][0]
  vi.unstubAllGlobals()
  return url
}

// 这组测试锁住 2026-10-11 定位到的接口形状问题:
// 首屏发 "offset=0 且 update_baseline 为空" 会被 B 站风控拒绝(HTTP 200 + code 4101133,
// data 为 undefined),表现为正在关注 / 订阅剧集两个页签永远显示空列表。
// 实测:带 page 的首屏请求返回 code 0;翻页必须用响应返回的 offset 原样续传。
describe('moment feed request shape', () => {
  it('first page sends page, and never the rejected offset=0 / empty update_baseline shape', async () => {
    const url = await requestUrlFor({ type: 'pgc', page: 1 })

    expect(url).toBe(`${FEED_URL}?type=pgc&page=1`)
    expect(url).not.toContain('offset=')
    expect(url).not.toContain('update_baseline')
  })

  it('keeps the type the caller asked for', async () => {
    expect(await requestUrlFor({ type: 'video', page: 1 })).toBe(`${FEED_URL}?type=video&page=1`)
    expect(await requestUrlFor({ type: 'all', page: 1 })).toBe(`${FEED_URL}?type=all&page=1`)
  })

  it('continues with the returned offset verbatim, without rounding it through Number()', async () => {
    // 真实的 offset 是 19 位字符串,超出 JS 安全整数范围:
    // Number('1226366931450200086') 会变成 1226366931450200000,参数因此被篡改
    const offset = '1226366931450200086'

    const url = await requestUrlFor({ type: 'pgc', offset })

    expect(url).toBe(`${FEED_URL}?type=pgc&offset=${offset}`)
    expect(url).toContain(offset)
    expect(url).not.toContain('page=')
    expect(Number(offset).toString()).not.toBe(offset)
  })
})
