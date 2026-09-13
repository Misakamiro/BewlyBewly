// window message 事件的来源校验:仅接受 B 站自身页面发来的消息
const TRUSTED_ORIGIN_HOST_SUFFIXES = ['.bilibili.com', '.hdslb.com']

export function isTrustedWebPageOrigin(origin: string): boolean {
  if (!origin)
    return false
  try {
    const { hostname } = new URL(origin)
    return hostname === 'bilibili.com'
      || hostname === 'hdslb.com'
      || TRUSTED_ORIGIN_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))
  }
  catch {
    return false
  }
}
