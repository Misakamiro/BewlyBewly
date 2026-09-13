import { describe, expect, it, vi } from 'vitest'
import type Browser from 'webextension-polyfill'

import {
  FIREFOX_CONTAINER_COOKIE_DOMAIN,
  getFirefoxContainerCookies,
  isTrustedMessageSender,
} from '~/background/utils'

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
