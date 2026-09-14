import browser from 'webextension-polyfill'

import { TABS_MESSAGE } from '~/background/messageListeners/tabs'

import { isBackgroundMessagingAvailable } from './api'

export function openLinkInBackground(url: string) {
  if (!isBackgroundMessagingAvailable())
    return
  return browser.runtime.sendMessage({
    contentScriptQuery: TABS_MESSAGE.OPEN_LINK_IN_BACKGROUND,
    url,
  })
}
