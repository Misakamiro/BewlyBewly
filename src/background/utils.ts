// 对于fetch的常见后处理
// 1. 直接返回data
// 2. json化后返回data

import type Browser from 'webextension-polyfill'
import browser from 'webextension-polyfill'

type FetchAfterHandler = ((data: Response) => Promise<any>) | ((data: any) => any)

function toJsonHandler(data: Response): Promise<any> {
  return data.json()
}
function toData(data: Promise<any>): Promise<any> {
  return data
}

// if need sendResponse, use this
// return a FetchAfterHandler function
function sendResponseHandler(sendResponse: Function) {
  return (data: any) => sendResponse(data)
}

// 定义后处理流
const AHS: {
  J_D: FetchAfterHandler[]
  J_S: FetchAfterHandler[]
  S: FetchAfterHandler[]
} = {
  J_D: [toJsonHandler, toData],
  J_S: [toJsonHandler, sendResponseHandler],
  S: [sendResponseHandler],
}

interface Message {
  contentScriptQuery: string
  [key: string]: any
}

interface _FETCH {
  method: string
  headers?: {
    [key: string]: any
  }
  body?: any
}

interface API {
  url: string
  _fetch: _FETCH
  params?: {
    [key: string]: any
  }
  afterHandle: ((response: Response) => Response | Promise<Response>)[]
}
// 重载API 可以为函数
type APIFunction = (message: Message, sender?: any, sendResponse?: Function) => any
export type APIType = API | APIFunction
interface APIMAP {
  [key: string]: APIType
}

export function serializeParams(params: Record<string, any>): string {
  const urlParams = new URLSearchParams()
  for (const key in params) {
    const value = params[key]
    if (value !== undefined && value !== null)
      urlParams.append(key, String(value))
  }
  return urlParams.toString()
}

export function cloneHeaders(headers?: Record<string, any>): Record<string, any> {
  return { ...(headers ?? {}) }
}

export interface WebRequestHeader {
  name: string
  value?: string
}

// Firefox webRequest 头处理:
// - firefox-multi-account-cookie 只转换为 Cookie 头,自定义头本身不能留在网络上
// - Origin/Referer 统一改写为调用方给定的 headerOrigin
//   (扩展自身发起的请求伪装为 www.bilibili.com,页面发起的请求保持其文档 origin)
export function rewriteBilibiliRequestHeaders(
  requestHeaders: WebRequestHeader[],
  headerOrigin: string,
): WebRequestHeader[] {
  const rewritten: WebRequestHeader[] = []
  for (const header of requestHeaders) {
    if (header.name === 'firefox-multi-account-cookie') {
      rewritten.push({ name: 'cookie', value: header.value ?? '' })
      continue
    }
    if (header.name.toLowerCase() === 'origin' || header.name.toLowerCase() === 'referer')
      rewritten.push({ name: header.name, value: headerOrigin })
    else
      rewritten.push(header)
  }
  return rewritten
}

// Firefox 多账户容器:只收集 B 站域的 Cookie,
// 避免把容器里其他站点的凭据一起发给 B 站
export const FIREFOX_CONTAINER_COOKIE_DOMAIN = 'bilibili.com'

export function getFirefoxContainerCookies(storeId: string) {
  return browser.cookies.getAll({ storeId, domain: FIREFOX_CONTAINER_COOKIE_DOMAIN })
}

// 内容脚本注入的站点 + 扩展自身页面之外,一律拒绝驱动后台 API 代理
const TRUSTED_MESSAGE_HOST_SUFFIXES = ['.bilibili.com', '.hdslb.com']

export function isTrustedMessageSender(sender?: Browser.Runtime.MessageSender): boolean {
  if (!sender)
    return true
  const url = sender.url ?? ''
  if (/^(?:chrome-extension|moz-extension|about):/.test(url))
    return true
  if (!url.startsWith('https://'))
    return false
  try {
    const { hostname } = new URL(url)
    return hostname === 'bilibili.com'
      || hostname === 'hdslb.com'
      || TRUSTED_MESSAGE_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))
  }
  catch {
    return false
  }
}

// 工厂函数API_LISTENER_FACTORY
function apiListenerFactory(API_MAP: APIMAP) {
  return async (message: Message, sender?: Browser.Runtime.MessageSender, sendResponse?: Function) => {
    if (!isTrustedMessageSender(sender)) {
      console.error(`Rejected message from untrusted sender: ${sender?.url ?? 'unknown'}`)
      return
    }
    const contentScriptQuery = message.contentScriptQuery
    // 检测是否有contentScriptQuery
    if (!contentScriptQuery || !API_MAP[contentScriptQuery])
      return console.error(`Cannot find this contentScriptQuery: ${contentScriptQuery}`)
    if (API_MAP[contentScriptQuery] instanceof Function)
      return (API_MAP[contentScriptQuery] as APIFunction)(message, sender, sendResponse)

    const api = API_MAP[contentScriptQuery] as API

    // eslint-disable-next-line node/prefer-global/process
    if (process.env.FIREFOX && sender && sender.tab && sender.tab.cookieStoreId) {
      const cookies = await getFirefoxContainerCookies(sender.tab.cookieStoreId)
      return doRequest(message, api, sendResponse, cookies)
    }

    return doRequest(message, api, sendResponse)
  }
}

function doRequest(message: Message, api: API, sendResponse?: Function, cookies?: Browser.Cookies.Cookie[]) {
  try {
    let { contentScriptQuery, ...rest } = message
    // rest above two part body or params
    rest = rest || {}

    let { _fetch, url, params = {}, afterHandle } = api
    const { method, body } = _fetch as _FETCH
    const headers = cloneHeaders((_fetch as _FETCH).headers)
    const isGET = method.toLocaleLowerCase() === 'get'
    // merge params and body
    const targetParams = Object.assign({}, params)
    let targetBody = Object.assign({}, body)
    Object.keys(rest).forEach((key) => {
      if (body && body[key] !== undefined)
        targetBody[key] = rest[key]
      else
        targetParams[key] = rest[key]
    })

    // generate params
    if (Object.keys(targetParams).length) {
      url += `?${serializeParams(targetParams)}`
    }
    // generate body
    if (!isGET) {
      targetBody = (headers && headers['Content-Type'] && headers['Content-Type'].includes('application/x-www-form-urlencoded'))
        ? new URLSearchParams(targetBody)
        : JSON.stringify(targetBody)
    }
    // generate cookies
    if (cookies) {
      const cookieStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      headers['firefox-multi-account-cookie'] = cookieStr
    }
    // get cant take body
    const fetchOpt = { method, headers }
    !isGET && Object.assign(fetchOpt, { body: targetBody })
    // fetch and after handle
    let baseFunc = fetch(url, {
      ...fetchOpt,
    })
    afterHandle.forEach((func) => {
      if (func.name === sendResponseHandler.name && sendResponse)
        // sendResponseHandler 是一个特殊的后处理函数，需要传入sendResponse
        baseFunc = baseFunc.then(sendResponseHandler(sendResponse))
      else
        baseFunc = baseFunc.then(func)
    })
    baseFunc.catch(console.error)
    return baseFunc
  }
  catch (e) {
    console.error(e)
  }
}

export {
  type _FETCH,
  AHS,
  type API,
  apiListenerFactory,
  type APIMAP,
  type FetchAfterHandler,
  type Message,
  sendResponseHandler,
  toData,
  toJsonHandler,
}
