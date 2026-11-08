import { ref } from 'vue'

/**
 * 通知抽屉里 message.bilibili.com iframe 的生命周期状态。
 *
 * 背景（为什么需要它）：抽屉被 TopBar 的 `<KeepAlive>` 缓存，关闭时组件不会卸载。
 * 如果 iframe 用 `v-show` 常驻，消息页文档就会一直活到标签页结束；标签页开久后，
 * 该文档内部的会话/连接/缓存失效，再打开抽屉就显示「加载失败」——而新开标签页
 * （全新文档）却正常。这正是「页面长时间没刷新，打开消息列表失败」的根因。
 *
 * 不变式（本模块存在的唯一目的，已由单测锁定）：
 *   - close() 之后 iframe 必须处于卸载状态（next open 才会重新加载新文档）；
 *   - open() 之后 iframe 必须处于挂载状态；
 *   - 每次 close() → open() 算一次新的加载轮次，round 递增，便于探针/测试断言"确实是新一轮"。
 */
export function useDrawerIframeLifecycle() {
  const iframeMounted = ref(false)
  const loadRound = ref(0)

  function open() {
    if (iframeMounted.value)
      return
    iframeMounted.value = true
    loadRound.value += 1
  }

  function close() {
    iframeMounted.value = false
  }

  return { iframeMounted, loadRound, open, close }
}
