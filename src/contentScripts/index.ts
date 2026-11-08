import '~/styles'
import 'uno.css'

import { createApp } from 'vue'

import { useDark } from '~/composables/useDark'
import { BEWLY_MOUNTED } from '~/constants/globalEvents'
import { settings } from '~/logic'
import { setupApp } from '~/logic/common-setup'
import RESET_BEWLY_CSS from '~/styles/reset.css?raw'
import { runWhenIdle } from '~/utils/lazyLoad'
import { compareVersions, injectCSS, isHomePage, isInIframe, isNotificationPage, isVideoOrBangumiPage } from '~/utils/main'
import { SVG_ICONS } from '~/utils/svgIcons'

import { version } from '../../package.json'
import App from './views/App.vue'

const isFirefox: boolean = /Firefox/i.test(navigator.userAgent)

// Fix `OverlayScrollbars` not working in Firefox
// https://github.com/fingerprintjs/fingerprintjs/issues/683#issuecomment-881210244
if (isFirefox) {
  window.requestIdleCallback = window.requestIdleCallback.bind(window)
  window.cancelIdleCallback = window.cancelIdleCallback.bind(window)
  window.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  window.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  window.setTimeout = window.setTimeout.bind(window)
  window.clearTimeout = window.clearTimeout.bind(window)
}

const currentUrl = document.URL

function isSupportedPages(): boolean {
  if (isInIframe())
    return false
  if (
    // homepage
    isHomePage()
    // video or bangumi page
    || isVideoOrBangumiPage()
    // popular page https://www.bilibili.com/v/popular/all
    || /https?:\/\/(?:www\.)?bilibili\.com\/v\/popular\/all.*/.test(currentUrl)
    // search page
    || /https?:\/\/search\.bilibili\.com\.*/.test(currentUrl)
    // moments page
    // https://github.com/BewlyBewly/BewlyBewly/issues/1246
    // https://github.com/BewlyBewly/BewlyBewly/issues/1256
    // https://github.com/BewlyBewly/BewlyBewly/issues/1266
    || /https?:\/\/t\.bilibili\.com(?!\/vote|\/share).*/.test(currentUrl)
    // moment detail
    || /https?:\/\/(?:www\.)?bilibili\.com\/opus\/.*/.test(currentUrl)
    // history page
    || /https?:\/\/(?:www\.)?bilibili\.com\/history.*/.test(currentUrl)
    || /https?:\/\/(?:www\.)?bilibili\.com\/account\/history.*/.test(currentUrl)
    // watcher later page
    || /https?:\/\/(?:www\.)?bilibili\.com\/watchlater\/#\/list.*/.test(currentUrl)
    || /https?:\/\/(?:www\.)?bilibili\.com\/watchlater\/list.*/.test(currentUrl)
    // user space page
    || /https?:\/\/space\.bilibili\.com\.*/.test(currentUrl)
    // notifications page
    || /https?:\/\/message\.bilibili\.com\.*/.test(currentUrl)
    // bilibili channel page b站分区页面
    || /https?:\/\/(?:www\.)?bilibili\.com\/v\/(?!popular).*/.test(currentUrl)
    // anime page & chinese anime page
    || /https?:\/\/(?:www\.)?bilibili\.com\/(?:anime|guochuang).*/.test(currentUrl)
    // channel page e.g. tv shows, movie, variety shows, mooc page
    || /https?:\/\/(?:www\.)?bilibili\.com\/(?:tv|movie|variety|mooc|documentary).*/.test(currentUrl)
    // article page
    || /https?:\/\/(?:www\.)?bilibili\.com\/read\/.*/.test(currentUrl)
    // 404 page
    || /^https?:\/\/(?:www\.)?bilibili\.com\/404.*$/.test(currentUrl)
    // creative center page 創作中心頁
    || /^https?:\/\/member\.bilibili\.com\/platform.*$/.test(currentUrl)
    // account settings page 帳號設定頁
    || /^https?:\/\/account\.bilibili\.com\/.*$/.test(currentUrl)
    // login page
    || /^https?:\/\/passport\.bilibili\.com\/login.*$/.test(currentUrl)
    // music center page 新歌熱榜 https://music.bilibili.com/pc/music-center/
    || /https?:\/\/music\.bilibili\.com\/pc\/music-center.*$/.test(currentUrl)
  ) {
    return true
  }
  else {
    return false
  }
}

export function isSupportedIframePages(): boolean {
  if (
    isInIframe()
    && (
      // supports Bilibili page URLs recorded in the dock
      isHomePage()
      // Since `Open in drawer` will open the video page within an iframe, so we need to support the following pages
      || isVideoOrBangumiPage()
      || /https?:\/\/search\.bilibili\.com\/all.*/.test(currentUrl)
      || /https?:\/\/www\.bilibili\.com\/anime.*/.test(currentUrl)
      || /https?:\/\/space\.bilibili\.com\/\d+\/favlist.*/.test(currentUrl)
      || /https?:\/\/www\.bilibili\.com\/history.*/.test(currentUrl)
      || /https?:\/\/www\.bilibili\.com\/watchlater\/#\/list.*/.test(currentUrl)
      || /https?:\/\/www\.bilibili\.com\/watchlater\/list.*/.test(currentUrl)
      // moments page
      // https://github.com/BewlyBewly/BewlyBewly/issues/1246
      // https://github.com/BewlyBewly/BewlyBewly/issues/1256
      // https://github.com/BewlyBewly/BewlyBewly/issues/1266
      || /https?:\/\/t\.bilibili\.com(?!\/vote|\/share).*/.test(currentUrl)
      // notifications page, for `Open the notifications page as a drawer`
      || isNotificationPage()
    )
  ) {
    return true
  }
  else {
    return false
  }
}

let beforeLoadedStyleEl: HTMLStyleElement | undefined

if (isSupportedPages() || isSupportedIframePages()) {
  if (settings.value.adaptToOtherPageStyles)
    useDark()

  if (settings.value.adaptToOtherPageStyles) {
    document.documentElement.classList.add('bewly-design')

    // Remove the Bilibili Evolved's dark mode style
    runWhenIdle(async () => {
      const darkModeStyle = document.head.querySelector('#dark-mode')
      if (darkModeStyle)
        document.head.removeChild(darkModeStyle)
    })
  }

  else {
    document.documentElement.classList.remove('bewly-design')
  }
}

if (settings.value.adaptToOtherPageStyles && isHomePage()) {
  beforeLoadedStyleEl = injectCSS(`
    html.bewly-design {
      background-color: var(--bew-bg);
      transition: background-color 0.2s ease-in;
    }

    body {
      display: none;
    }
  `)

  // Add opacity transition effect for page loaded
  injectCSS(`
    body {
      transition: opacity 0.5s;
    }
  `)
}

window.addEventListener(BEWLY_MOUNTED, () => {
  if (beforeLoadedStyleEl)
    document.documentElement.removeChild(beforeLoadedStyleEl)
  // app 已挂载(Bewly 顶栏已渲染)后才放开原生顶栏,避免"原生顶栏先闪一下/页面顶部空一片"
  releaseRemoveOriginalTopBar()
})

// Set the original Bilibili top bar to `display: none` to prevent it from showing before the load
// see: https://github.com/BewlyBewly/BewlyBewly/issues/967
//
// 撤除时机很关键:此前在 DOMContentLoaded 就移除,而非首页的 app 是 `injectAppWhenIdle()`
// 延迟注入的,于是"原生顶栏已放出来、Bewly 顶栏还没挂载"之间会出现一个空窗期 ——
// 用户看到的正是"打开视频页一瞬间顶栏没被美化,过一会才出现"。现已改为等 app 真正挂载
// (BEWLY_MOUNTED,与首页 beforeLoadedStyleEl 用同一个信号)后再撤除。
// iframe 内不显示 Bewly 顶栏,仍按原逻辑在 DOMContentLoaded 撤除,否则会把 iframe 的原生顶栏永久藏掉。
const removeOriginalTopBar = injectCSS(`.bili-header, #biliMainHeader { visibility: hidden !important; }`)
let removeOriginalTopBarReleased = false
function releaseRemoveOriginalTopBar() {
  if (removeOriginalTopBarReleased || !removeOriginalTopBar)
    return
  removeOriginalTopBarReleased = true
  removeOriginalTopBar.remove()
}

async function onDOMLoaded() {
  let originalTopBar: HTMLElement | null = null

  const changeHomePage = !isInIframe() && !settings.value.useOriginalBilibiliHomepage && isHomePage()

  // Remove the original Bilibili homepage if in Bilibili homepage & useOriginalBilibiliHomepage is enabled
  if (changeHomePage) {
    originalTopBar = document.querySelector<HTMLElement>('.bili-header')
    const originalTopBarInnerUselessContents = document.querySelectorAll<HTMLElement>('.bili-header > *:not(.bili-header__bar)')

    if (originalTopBar) {
      // always show the background on the original bilibili top bar
      originalTopBar.querySelector('.bili-header__bar')?.classList.add('slide-down')
    }

    // Remove the original Bilibili homepage if in Bilibili homepage & useOriginalBilibiliHomepage is enabled
    document.body.innerHTML = ''

    // Remove the Bilibili Evolved homepage & Bilibili-Gate homepage
    injectCSS(`
      .home-redesign-base, .bilibili-gate-root {
        display: none !important;
      }
    `)

    if (originalTopBarInnerUselessContents)
      originalTopBarInnerUselessContents.forEach(item => (item as HTMLElement).style.display = 'none')
    if (originalTopBar)
      document.body.appendChild(originalTopBar)
  }

  if (isSupportedPages() || isSupportedIframePages()) {
    // Then inject the app
    if (isHomePage()) {
      injectApp()
    }
    else {
      await injectAppWhenIdle()
    }
  }

  // Reset the original Bilibili top bar display style.
  // 非 iframe 页面改为等 app 挂载(BEWLY_MOUNTED)后再撤除,见 releaseRemoveOriginalTopBar 上方的说明;
  // iframe 内没有 Bewly 顶栏,立即撤除以免原生顶栏被永久隐藏。
  if (isInIframe()) {
    releaseRemoveOriginalTopBar()
  }
  else {
    // 安全兜底:若 app 因故没能挂载(脚本异常/被页面破坏),也不能让原生顶栏一直藏着。
    setTimeout(releaseRemoveOriginalTopBar, 8000)
  }
}

if (document.readyState !== 'loading')
  onDOMLoaded()
else
  document.addEventListener('DOMContentLoaded', () => onDOMLoaded())

// 非首页把 app 注入推迟到浏览器空闲,避免和页面自身首屏渲染抢主线程。
// 但 requestIdleCallback 在忙碌页面上可能很久不回调,且不传 timeout 时没有兜底 ——
// 顶栏的可见性就卡在这段时间里。给一个上限,保证最迟 1.5s 内 app 一定开始注入。
const APP_INJECT_IDLE_TIMEOUT = 1500

function injectAppWhenIdle() {
  return new Promise<void>((resolve) => {
    // Inject app when idle
    runWhenIdle(async () => {
      injectApp()
      resolve()
    }, APP_INJECT_IDLE_TIMEOUT)
  })
}

function injectApp() {
  // Remove bewly element if it already exists and the version is less than the current version
  // Only the development mode bewly element remains
  const bewlyElArr: NodeListOf<Element> = document.querySelectorAll('#bewly')
  if (bewlyElArr.length > 0) {
    // alert(`
    //   You have multiple versions of BewlyBewly installed. Please retain only one to avoid conflicts and issues!
    //   您安装了多个版本的 BewlyBewly。请只保留一个版本以避免冲突和问题！
    //   您安裝了多個版本的 BewlyBewly。請只保留一個版本以避免衝突和問題！
    //   你單咗幾個版本嘅 BewlyBewly。請淨係留一個版本嚟避免衝突同問題！
    // `)

    bewlyElArr.forEach((el: Element) => {
      const elVersion = el.getAttribute('data-version') || '0.0.0'
      const elIsDev = el.getAttribute('data-dev') === 'true'

      // Remove bewly element if the version is less than the current version
      if (compareVersions(elVersion, version) < 0)
        el.remove()
      // Only the development mode element remains
      else if (!elIsDev)
        el.remove()
    })
  }

  // mount component to context window
  const container = document.createElement('div')
  container.id = 'bewly'
  container.setAttribute('data-version', version)
  container.setAttribute('data-dev', import.meta.env.DEV ? 'true' : 'false')
  const root = document.createElement('div')
  const styleEl = document.createElement('link')
  // Fix #69 https://github.com/hakadao/BewlyBewly/issues/69
  // https://medium.com/@emilio_martinez/shadow-dom-open-vs-closed-1a8cf286088a - open shadow dom
  const shadowDOM = container.attachShadow?.({ mode: 'open' }) || container
  const resetStyleEl = document.createElement('style')
  resetStyleEl.textContent = `${RESET_BEWLY_CSS}`
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(resetStyleEl)
  shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  container.style.opacity = '0'
  container.style.transition = 'opacity 0.5s'
  styleEl.onload = () => {
    // 样式表加载完就尽快淡入。原先固定再等 500ms 才置 opacity,叠加在"原生顶栏已隐藏"
    // 之上会额外拉长顶部空白的时间(实测总空窗约 1.9s)。这里改成等字体就绪后尽快显示,
    // 上限只保留一个很短的兜底,避免字体一直不 ready 时永远不显示。
    let shown = false
    const showContainer = () => {
      if (shown)
        return
      shown = true
      container.style.opacity = '1'
    }
    setTimeout(showContainer, 120)
    document.fonts?.ready.then(showContainer).catch(() => {})
  }

  // startShadowDOMStyleInjection()

  // inject svg icons
  const svgDiv = document.createElement('div')
  svgDiv.innerHTML = SVG_ICONS
  shadowDOM.appendChild(svgDiv)

  document.body.appendChild(container)

  const app = createApp(App)
  setupApp(app)
  app.mount(root)
}

// 實際使用實在太卡，註釋了先
// function startShadowDOMStyleInjection() {
//   if (isHomePage() || !isSupportedPages())
//     return

//   const styleCache = new WeakSet() // Track which shadow roots have been processed

//   function injectStyleToShadowDOM(shadowRoot: ShadowRoot) {
//     if (styleCache.has(shadowRoot))
//       return

//     const styleEl = document.createElement('style')
//     styleEl.setAttribute('data-bewly-style', 'true')
//     styleEl.textContent = `
//       @import url(${browser.runtime.getURL('dist/contentScripts/style.css')});
//       ${settings.value.adaptToOtherPageStyles
//       ? `
//         * {
//           --bew-theme-color: ${settings.value.themeColor};
//           --bew-theme-color-10: color-mix(in oklab, var(--bew-theme-color), transparent 90%);
//           --bew-theme-color-20: color-mix(in oklab, var(--bew-theme-color), transparent 80%);
//           --bew-theme-color-30: color-mix(in oklab, var(--bew-theme-color), transparent 70%);
//           --bew-theme-color-40: color-mix(in oklab, var(--bew-theme-color), transparent 60%);
//           --bew-theme-color-50: color-mix(in oklab, var(--bew-theme-color), transparent 50%);
//           --bew-theme-color-60: color-mix(in oklab, var(--bew-theme-color), transparent 40%);
//           --bew-theme-color-70: color-mix(in oklab, var(--bew-theme-color), transparent 30%);
//           --bew-theme-color-80: color-mix(in oklab, var(--bew-theme-color), transparent 20%);
//           --bew-theme-color-90: color-mix(in oklab, var(--bew-theme-color), transparent 10%);
//         }
//       `
//       : ''}
//     `
//     shadowRoot.appendChild(styleEl)
//     styleCache.add(shadowRoot)
//   }

//   function processShadowDOM(node: HTMLElement) {
//     if (node.shadowRoot) {
//       injectStyleToShadowDOM(node.shadowRoot)
//       observeShadowRoot(node.shadowRoot)
//     }

//     // Process child elements with shadow roots
//     node.querySelectorAll('*').forEach((el) => {
//       if (el instanceof HTMLElement && el.shadowRoot) {
//         injectStyleToShadowDOM(el.shadowRoot)
//         observeShadowRoot(el.shadowRoot)
//       }
//     })
//   }

//   function observeShadowRoot(shadowRoot: ShadowRoot) {
//     const observer = new MutationObserver((mutations) => {
//       mutations.forEach((mutation) => {
//         if (mutation.type === 'childList') {
//           mutation.addedNodes.forEach((node) => {
//             if (node instanceof HTMLElement)
//               processShadowDOM(node)
//           })
//         }
//       })
//     })

//     observer.observe(shadowRoot, {
//       childList: true,
//       subtree: true,
//     })
//   }

//   // Initial setup
//   const rootObserver = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//       if (mutation.type === 'childList') {
//         mutation.addedNodes.forEach((node) => {
//           if (node instanceof HTMLElement)
//             processShadowDOM(node)
//         })
//       }
//     })
//   })

//   // Start observing document body
//   rootObserver.observe(document.body, {
//     childList: true,
//     subtree: true,
//   })

//   // Process existing shadow DOMs
//   document.querySelectorAll('*').forEach((el) => {
//     if (el instanceof HTMLElement && el.shadowRoot) {
//       injectStyleToShadowDOM(el.shadowRoot)
//       observeShadowRoot(el.shadowRoot)
//     }
//   })
// }
