import type { API_COLLECTION } from '~/background/messageListeners/api'

type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>

type APIFunction<T = typeof API_COLLECTION> = {
  [K in keyof T as CamelCase<string & K>]: {
    // @ts-expect-error allow params
    [P in keyof T[K]]: T[K][P] extends Function ? T[K][P] : Lowercase<T[K][P]['_fetch']['method']> extends 'get' ? (options?: Partial<T[K][P]['params']>) => Promise<any> : (options?: Partial<T[K][P]['params'] & T[K][P]['_fetch']['body']>) => Promise<any>
  }
}

// eslint-disable-next-line ts/no-unsafe-declaration-merging
export interface APIClient extends APIFunction<typeof API_COLLECTION> {

}

// eslint-disable-next-line ts/no-unsafe-declaration-merging
export class APIClient {
  private readonly cache = new Map<string | symbol, any>()

  constructor() {
    // @ts-expect-error ignore
    return new Proxy({}, {
      get: (_, namespace) => { // namespace
        if (this.cache.has(namespace)) {
          return this.cache.get(namespace)
        }
        else {
          const api = new Proxy({}, {
            get(_, p) {
              return (options?: object) => {
                if (!isBackgroundMessagingAvailable())
                  return Promise.resolve(undefined)
                return browser.runtime.sendMessage({
                  contentScriptQuery: p,
                  ...options,
                })
              }
            },
          })
          this.cache.set(namespace, api)
          return api
        }
      },
    })
  }
}

let backgroundMessagingDisabled = false

// 扩展被重载/更新后,旧页面的扩展 context 已失效,继续调用 runtime API
// 只会抛 "Extension context invalidated"。这里统一检测并静默停摆,
// 刷新页面即可恢复。
export function isBackgroundMessagingAvailable(): boolean {
  if (backgroundMessagingDisabled)
    return false
  try {
    if (browser.runtime?.id)
      return true
  }
  catch {
    // polyfill 在 context 失效后可能直接抛错
  }
  backgroundMessagingDisabled = true
  console.warn('[BewlyBewly] 扩展已重载或更新,本页面的旧实例已停用后台通信;刷新页面即可恢复。')
  return false
}

const api = new APIClient()

export default api
