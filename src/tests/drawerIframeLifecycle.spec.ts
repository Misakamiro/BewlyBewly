import { describe, expect, it } from 'vitest'

import { useDrawerIframeLifecycle } from '~/composables/useDrawerIframeLifecycle'

// 「页面长时间没刷新,打开消息列表失败」的根因是:通知抽屉被 KeepAlive 缓存,
// 里面的 message.bilibili.com iframe 用 v-show 常驻,文档活到标签页结束、
// 内部会话/连接失效后打开就是「加载失败」;新开标签页是全新文档所以正常。
// 修复要求:关闭抽屉时 iframe 必须卸载,下次打开必然是新文档。
// 这组测试锁住这个不变式 —— 只要有人把它改回"常驻缓存",这里就会红。
describe('useDrawerIframeLifecycle', () => {
  it('starts with no iframe mounted', () => {
    const { iframeMounted, loadRound } = useDrawerIframeLifecycle()

    expect(iframeMounted.value).toBe(false)
    expect(loadRound.value).toBe(0)
  })

  it('mounts the iframe on open and counts it as a load round', () => {
    const { iframeMounted, loadRound, open } = useDrawerIframeLifecycle()

    open()
    expect(iframeMounted.value).toBe(true)
    expect(loadRound.value).toBe(1)
  })

  it('unmounts the iframe on close so the stale document is destroyed', () => {
    const { iframeMounted, open, close } = useDrawerIframeLifecycle()

    open()
    close()
    expect(iframeMounted.value).toBe(false)
  })

  it('re-mounts on the next open and advances the load round (fresh document each time)', () => {
    const { iframeMounted, loadRound, open, close } = useDrawerIframeLifecycle()

    open()
    close()
    open()
    expect(iframeMounted.value).toBe(true)
    expect(loadRound.value).toBe(2)

    close()
    open()
    expect(loadRound.value).toBe(3)
  })

  it('does not advance the round when open is called twice without closing', () => {
    // onMounted 与 onActivated 都会调用 handleOpen;重复 open 不应制造"多余的一轮加载"
    const { loadRound, open } = useDrawerIframeLifecycle()

    open()
    open()
    open()
    expect(loadRound.value).toBe(1)
  })
})
