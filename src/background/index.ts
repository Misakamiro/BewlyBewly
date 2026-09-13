import browser from 'webextension-polyfill'

import { setupApiMsgLstnrs } from './messageListeners/api'
import { setupTabMsgLstnrs } from './messageListeners/tabs'
import { rewriteBilibiliRequestHeaders } from './utils'

browser.runtime.onInstalled.addListener(async () => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

function isExtensionUri(url: string) {
  return new URL(url).origin === new URL(browser.runtime.getURL('')).origin
}

// eslint-disable-next-line node/prefer-global/process
if (process.env.FIREFOX) {
  browser.webRequest.onBeforeSendHeaders.addListener(
    async (details: any) => {
      try {
        const requestHeaders: browser.WebRequest.HttpHeaders = details.requestHeaders || []
        const hasContainerCookie = requestHeaders.some(header => header.name === 'firefox-multi-account-cookie')
        // 顶级导航等无关联文档的请求不做改写
        if (!hasContainerCookie && !details.documentUrl)
          return

        // 扩展自身发起的请求(无文档或文档为扩展页)伪装为 www.bilibili.com,
        // 页面发起的请求保持其文档 origin
        let headerOrigin = 'https://www.bilibili.com'
        if (details.documentUrl && !isExtensionUri(details.documentUrl))
          headerOrigin = new URL(details.documentUrl).origin

        return { ...details, requestHeaders: rewriteBilibiliRequestHeaders(requestHeaders, headerOrigin) }
      }
      catch (error) {
        console.error('Failed to rewrite bilibili request headers:', error)
      }
    },
    // 只处理 B 站自家请求,不碰用户其他浏览流量
    { urls: ['*://*.bilibili.com/*', '*://*.hdslb.com/*'] },
    ['blocking', 'requestHeaders'],
  )
}

// Setup all message listeners
setupApiMsgLstnrs()
setupTabMsgLstnrs()
