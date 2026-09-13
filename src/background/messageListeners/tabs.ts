import type Browser from 'webextension-polyfill'
import browser from 'webextension-polyfill'

import { isTrustedMessageSender } from '../utils'

interface Message {
  contentScriptQuery: string
  [key: string]: any
}

export enum TABS_MESSAGE {
  OPEN_LINK_IN_BACKGROUND = 'openLinkInBackground',
}

export function isSafeOpenUrl(url: unknown): url is string {
  if (typeof url !== 'string')
    return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  }
  catch {
    return false
  }
}

function handleMessage(message: Message, sender?: Browser.Runtime.MessageSender) {
  if (!isTrustedMessageSender(sender)) {
    console.error(`Rejected openLinkInBackground from untrusted sender: ${sender?.url ?? 'unknown'}`)
    return
  }
  if (message.contentScriptQuery === TABS_MESSAGE.OPEN_LINK_IN_BACKGROUND) {
    if (!isSafeOpenUrl(message.url)) {
      console.error(`Rejected unsafe url for openLinkInBackground: ${message.url}`)
      return
    }
    return browser.tabs.create({ url: message.url, active: false })
  }
}

export function setupTabMsgLstnrs() {
  browser.runtime.onMessage.removeListener(handleMessage)
  browser.runtime.onMessage.addListener(handleMessage)
}
