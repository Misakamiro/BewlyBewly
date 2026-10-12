import { describe, expect, it, vi } from 'vitest'

import {
  apiListenerFactory,
  createTimeoutSignal,
  REQUEST_TIMEOUT_MS,
  toJsonHandler,
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

// 「正在关注 / 订阅剧集」曾因接口返回非 0 码(风控 4101133)被静默当成空列表,
// 坏了很久都没人发现。后台代理现在统一观察响应码并留痕;这组测试锁住该行为,
// 同时确认它不改变返回值。
describe('unexpected api code logging', () => {
  async function runWithCode(code: number) {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => ({ code }) }))
    vi.stubGlobal('fetch', fetchMock)

    const apiMap = {
      ping: {
        url: 'https://api.bilibili.com/x/test',
        _fetch: { method: 'GET' },
        afterHandle: [toJsonHandler],
      },
    }

    const listener = apiListenerFactory(apiMap)
    const result = await listener({ contentScriptQuery: 'ping' })

    const warnings = warn.mock.calls.map(call => String(call[0]))
    warn.mockRestore()
    vi.unstubAllGlobals()
    return { result, warnings }
  }

  it('warns when an endpoint returns an unexpected code, without touching the result', async () => {
    const { result, warnings } = await runWithCode(4101133)

    expect(result).toEqual({ code: 4101133 })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('4101133')
    expect(warnings[0]).toContain('/x/test')
  })

  it('stays silent for a healthy response and for the normal not-logged-in code', async () => {
    expect((await runWithCode(0)).warnings).toHaveLength(0)
    expect((await runWithCode(-101)).warnings).toHaveLength(0)
  })
})
