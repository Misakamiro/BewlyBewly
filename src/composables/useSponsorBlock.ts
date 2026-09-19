import { useEventListener } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import { settings } from '~/logic'
import api from '~/utils/api'
import { isVideoOrBangumiPage, queryDomUntilFound } from '~/utils/main'
import { filterSponsorSegments, getPageNumberFromSearch, parseBvidFromPath, resolveCid, type SponsorSegment } from '~/utils/sponsorBlock'

const MARKER_CLASS = 'bewly-sponsor-marker'

// 视频页推广分段(BilibiliSponsorBlock):进度条标记 + 自动跳过。
// 从 App.vue setup 调用;视频页在顶窗和 IframeDrawer 内都会跑本逻辑
// (manifest all_frames: true)。
export function setupSponsorBlock() {
  if (!isVideoOrBangumiPage())
    return

  const { t } = useI18n()
  const toast = useToast()

  let setupToken = 0
  let abortController: AbortController | null = null
  let currentVideoEl: HTMLVideoElement | null = null
  let currentSegments: SponsorSegment[] = []
  let skippedUuids = new Set<string>()
  let onTimeUpdate: (() => void) | null = null

  const isActive = () =>
    settings.value.enableSponsorBlockMark || settings.value.enableSponsorBlockAutoSkip

  function clearMarkers() {
    document.querySelectorAll(`.${MARKER_CLASS}`).forEach(el => el.remove())
  }

  function applyMarkers(video: HTMLVideoElement) {
    clearMarkers()
    if (!settings.value.enableSponsorBlockMark || currentSegments.length === 0)
      return
    const bar = document.querySelector('.bpx-player-progress') as HTMLElement | null
    if (!bar)
      return
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : currentSegments[0]?.videoDuration
    if (!duration || !Number.isFinite(duration) || duration <= 0)
      return
    for (const seg of currentSegments) {
      const [start, end] = seg.segment
      // 试看/预览等场景下 video.duration 可能远小于分段位置,超出部分不画
      if (start >= duration)
        continue
      const el = document.createElement('div')
      el.className = MARKER_CLASS
      el.dataset.uuid = seg.UUID
      el.title = t('common.sponsor_marker_title')
      Object.assign(el.style, {
        position: 'absolute',
        left: `${(start / duration) * 100}%`,
        width: `${Math.max(((end - start) / duration) * 100, 0.3)}%`,
        top: '0',
        height: '100%',
        background: 'rgba(255, 170, 0, 0.45)',
        borderInlineStart: '2px solid rgba(255, 170, 0, 0.9)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      } as CSSStyleDeclaration)
      bar.appendChild(el)
    }
  }

  function handleTimeUpdate() {
    const video = currentVideoEl
    if (!video)
      return

    // 播放器重建进度条后自愈:标记数量与分段数不符时重画
    if (settings.value.enableSponsorBlockMark && currentSegments.length > 0
      && document.querySelectorAll(`.${MARKER_CLASS}`).length !== currentSegments.length) {
      applyMarkers(video)
    }

    if (!settings.value.enableSponsorBlockAutoSkip)
      return
    const current = video.currentTime
    for (const seg of currentSegments) {
      const [start, end] = seg.segment
      if (current >= start && current < end - 0.05 && !skippedUuids.has(seg.UUID)) {
        skippedUuids.add(seg.UUID)
        video.currentTime = end
        toast.info(t('common.sponsor_skipped'))
        break
      }
    }
  }

  function teardown() {
    setupToken++
    abortController?.abort()
    abortController = null
    if (currentVideoEl && onTimeUpdate)
      currentVideoEl.removeEventListener('timeupdate', onTimeUpdate)
    currentVideoEl = null
    onTimeUpdate = null
    currentSegments = []
    skippedUuids = new Set()
    clearMarkers()
  }

  async function setup() {
    teardown()
    // eslint-disable-next-line no-console
    console.debug('[BewlySponsor] setup', { active: isActive(), url: location.pathname })
    if (!isActive())
      return

    const bvid = parseBvidFromPath(location.pathname)
    if (!bvid) {
      // eslint-disable-next-line no-console
      console.debug('[BewlySponsor] no bvid parsed')
      return
    }

    const token = setupToken
    abortController = new AbortController()

    // 播放器视频元素(bpx 播放器渲染较晚)
    const video = await queryDomUntilFound('video', 500, abortController)
    // eslint-disable-next-line no-console
    console.debug('[BewlySponsor] video element', { found: Boolean(video), stale: token !== setupToken })
    if (token !== setupToken || !video)
      return
    currentVideoEl = video as HTMLVideoElement
    onTimeUpdate = handleTimeUpdate
    currentVideoEl.addEventListener('timeupdate', onTimeUpdate)

    // 当前分 P 的 cid(多 P 视频按 URL ?p= 定位)
    let cid: number | null = null
    let pageCount = 1
    try {
      const info = await api.video.getVideoInfo({ bvid })
      if (token !== setupToken)
        return
      const pages = info?.data?.pages
      if (info?.code === 0 && Array.isArray(pages)) {
        pageCount = pages.length
        cid = resolveCid(pages, getPageNumberFromSearch(location.search))
      }
      // eslint-disable-next-line no-console
      console.debug('[BewlySponsor] video info', { code: info?.code, pageCount, cid })
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[BewlySponsor] video info failed', String(error).slice(0, 120))
    }

    // BSB 查询:无分段(404)或异常一律按"无分段"处理
    let segments: SponsorSegment[] = []
    try {
      const res = await api.sponsorBlock.getSponsorSegments({ videoID: bvid })
      if (token !== setupToken)
        return
      segments = filterSponsorSegments(res, cid, pageCount)
      // eslint-disable-next-line no-console
      console.debug('[BewlySponsor] BSB segments', { raw: Array.isArray(res) ? res.length : String(res).slice(0, 80), kept: segments.length })
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[BewlySponsor] BSB query treated as no segments', String(error).slice(0, 120))
    }

    currentSegments = segments
    if (token !== setupToken)
      return
    // eslint-disable-next-line no-console
    console.debug('[BewlySponsor] applying', { segments: currentSegments.length, duration: currentVideoEl?.duration })
    applyMarkers(currentVideoEl)
  }

  watch(
    [() => settings.value.enableSponsorBlockMark, () => settings.value.enableSponsorBlockAutoSkip],
    () => {
      if (isActive())
        setup()
      else
        teardown()
    },
  )

  // 站内切换视频(pushState/replaceState)与浏览器前进后退
  useEventListener(window, 'historyChange', () => {
    if (isActive())
      setup()
  })
  useEventListener(window, 'popstate', () => {
    if (isActive())
      setup()
  })

  setup()
}
