import { describe, expect, it, vi } from 'vitest'

import {
  apiListenerFactory,
  createTimeoutSignal,
  REQUEST_TIMEOUT_MS,
} from '~/background/utils'

vi.mock('webextension-polyfill', () => {
  // 后台模块在导入时会引用 polyfill;测试环境没有真实扩展 API,铺一个最小替身
  const api = { cookies: { getAll: vi.fn(async () => []) } }
  return { ...api, default: api }
})

describe('createTimeoutSignal', () => {
  it('uses a positive timeout', () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('aborts once the timeout elapses', async () => {
    const signal = createTimeoutSignal(10)

    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)

    await new Promise<void>((resolve) => {
      signal?.addEventListener('abort', () => resolve(), { once: true })
    })

    expect(signal?.aborted).toBe(true)
  })
})

describe('background request timeout wiring', () => {
  it('passes an abort signal to fetch, so a stalled request cannot hang the caller forever', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)

    const apiMap = {
      ping: {
        url: 'https://api.bilibili.com/x/test',
        _fetch: { method: 'GET' },
        afterHandle: [],
      },
    }

    const listener = apiListenerFactory(apiMap)
    await listener({ contentScriptQuery: 'ping' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.signal).toBeInstanceOf(AbortSignal)

    vi.unstubAllGlobals()
  })
})
