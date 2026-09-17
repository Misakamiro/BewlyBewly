import { describe, expect, it, vi } from 'vitest'
import type Browser from 'webextension-polyfill'

import { isSafeOpenUrl } from '~/background/messageListeners/tabs'
import {
  FIREFOX_CONTAINER_COOKIE_DOMAIN,
  getFirefoxContainerCookies,
  isTrustedMessageSender,
  rewriteBilibiliRequestHeaders,
  shouldRewriteBilibiliRequestHeaders,
} from '~/background/utils'
import { isBackgroundMessagingAvailable } from '~/utils/api'
import { isTrustedWebPageOrigin } from '~/utils/trust'

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn(async () => []) }))

vi.mock('webextension-polyfill', () => {
  // auto-import 以 `import * as browser` 方式引用,需要同时铺在命名空间顶层和 default 上
  const api = { cookies: { getAll: getAllMock } }
  return { ...api, default: api }
})

function senderWith(url?: string): Browser.Runtime.MessageSender {
  return { url } as Browser.Runtime.MessageSender
}

describe('background message trust boundary', () => {
  it('accepts extension-internal senders and messages without sender details', () => {
    expect(isTrustedMessageSender(undefined)).toBe(true)
    expect(isTrustedMessageSender(senderWith('chrome-extension://abcdef/options/index.html'))).toBe(true)
    expect(isTrustedMessageSender(senderWith('moz-extension://uuid-1234/dist/popup/index.html'))).toBe(true)
    expect(isTrustedMessageSender(senderWith('safari-web-extension://uuid-5678/options/index.html'))).toBe(true)
  })

  it('accepts senders from hosts the content scripts are declared on', () => {
    expect(isTrustedMessageSender(senderWith('https://www.bilibili.com/'))).toBe(true)
    expect(isTrustedMessageSender(senderWith('https://passport.bilibili.com/login'))).toBe(true)
    expect(isTrustedMessageSender(senderWith('https://www.hdslb.com/'))).toBe(true)
  })

  it('rejects senders from other schemes and hosts', () => {
    expect(isTrustedMessageSender(senderWith('https://evil.example.com/frame'))).toBe(false)
    expect(isTrustedMessageSender(senderWith('http://www.bilibili.com/'))).toBe(false)
    expect(isTrustedMessageSender(senderWith('file:///C:/page.html'))).toBe(false)
    expect(isTrustedMessageSender(senderWith('not a url'))).toBe(false)
    expect(isTrustedMessageSender(senderWith(undefined))).toBe(false)
  })
})

describe('firefox container cookie collection', () => {
  it('scopes browser.cookies.getAll to bilibili domains only', async () => {
    await getFirefoxContainerCookies('store-1')

    expect(getAllMock).toHaveBeenCalledWith({
      storeId: 'store-1',
      domain: FIREFOX_CONTAINER_COOKIE_DOMAIN,
    })
    expect(FIREFOX_CONTAINER_COOKIE_DOMAIN).toBe('bilibili.com')
  })
})

describe('webrequest header rewriting', () => {
  const containerCookieHeader = { name: 'firefox-multi-account-cookie', value: 'SESSDATA=abc' }

  it('rewrites whenever the container cookie header is present', () => {
    expect(shouldRewriteBilibiliRequestHeaders([containerCookieHeader], undefined)).toBe(true)
    expect(shouldRewriteBilibiliRequestHeaders([containerCookieHeader], 'https://www.bilibili.com/')).toBe(true)
  })

  it('rewrites document-bound requests without the cookie header', () => {
    expect(shouldRewriteBilibiliRequestHeaders([{ name: 'Accept', value: '*/*' }], 'https://space.bilibili.com/1')).toBe(true)
  })

  it('skips document-less requests without the cookie header', () => {
    expect(shouldRewriteBilibiliRequestHeaders([{ name: 'Accept', value: '*/*' }], undefined)).toBe(false)
  })

  it('never rewrites when request headers are missing', () => {
    expect(shouldRewriteBilibiliRequestHeaders(undefined, 'https://www.bilibili.com/')).toBe(false)
    expect(shouldRewriteBilibiliRequestHeaders(undefined, undefined)).toBe(false)
  })

  it('converts the container cookie header to cookie and keeps the raw header off the wire', () => {
    const out = rewriteBilibiliRequestHeaders(
      [
        { name: 'User-Agent', value: 'ua' },
        { name: 'firefox-multi-account-cookie', value: 'SESSDATA=abc' },
        { name: 'Origin', value: 'moz-extension://uuid/background.html' },
      ],
      'https://www.bilibili.com',
    )

    expect(out).toEqual([
      { name: 'User-Agent', value: 'ua' },
      { name: 'cookie', value: 'SESSDATA=abc' },
      { name: 'Origin', value: 'https://www.bilibili.com' },
    ])
    expect(out.some(header => header.name === 'firefox-multi-account-cookie')).toBe(false)
  })

  it('rewrites origin/referer while keeping other headers untouched', () => {
    const out = rewriteBilibiliRequestHeaders(
      [{ name: 'Referer', value: 'https://www.bilibili.com/video/BV1' }],
      'https://space.bilibili.com/1',
    )

    expect(out).toEqual([{ name: 'Referer', value: 'https://space.bilibili.com/1' }])
  })
})

describe('isSafeOpenUrl', () => {
  it('allows http(s) urls only', () => {
    expect(isSafeOpenUrl('https://www.bilibili.com/video/BV1')).toBe(true)
    expect(isSafeOpenUrl('http://example.com')).toBe(true)
    expect(isSafeOpenUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeOpenUrl('data:text/html,<b>')).toBe(false)
    expect(isSafeOpenUrl('file:///C:/x')).toBe(false)
    expect(isSafeOpenUrl(undefined)).toBe(false)
    expect(isSafeOpenUrl(42)).toBe(false)
  })
})

describe('trusted web page origins', () => {
  it('accepts bilibili/hdslb origins and rejects everything else', () => {
    expect(isTrustedWebPageOrigin('https://www.bilibili.com')).toBe(true)
    expect(isTrustedWebPageOrigin('https://player.bilibili.com')).toBe(true)
    expect(isTrustedWebPageOrigin('https://www.hdslb.com')).toBe(true)
    expect(isTrustedWebPageOrigin('https://evil.example.com')).toBe(false)
    expect(isTrustedWebPageOrigin('')).toBe(false)
    expect(isTrustedWebPageOrigin('not a url')).toBe(false)
  })
})

describe('background messaging availability latch', () => {
  it('latches off when the extension context is invalidated', () => {
    // 本文件的 mock 命名空间没有 runtime 导出,访问即抛 -> 视为 context 失效
    expect(isBackgroundMessagingAvailable()).toBe(false)
    // 单向锁存:后续调用不再触碰 runtime
    expect(isBackgroundMessagingAvailable()).toBe(false)
  })
})
