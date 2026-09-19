// BilibiliSponsorBlock(BSB)视频内推广分段的解析与过滤纯函数

export interface SponsorSegment {
  segment: [number, number]
  category: string
  actionType: string
  UUID: string
  cid?: string | number
  videoDuration?: number
}

// 只把"恰饭推广"与"自推广"当作广告;interaction(三连)、intro/outro 等不处理
export const SPONSOR_CATEGORIES = ['sponsor', 'selfpromo']

export function parseBvidFromPath(pathname: string): string | null {
  const match = pathname.match(/\/video\/(BV[0-9A-Za-z]+)/)
  return match ? match[1] : null
}

export function getPageNumberFromSearch(search: string): number {
  const p = new URLSearchParams(search).get('p')
  const num = Number(p)
  return Number.isInteger(num) && num > 0 ? num : 1
}

// 从视频信息(含分 P 列表)定位当前分 P 的 cid;无分 P 数据时返回 null
export function resolveCid(pages: { cid: number, page: number }[] | undefined, page: number): number | null {
  if (!Array.isArray(pages) || pages.length === 0)
    return null
  const found = pages.find(p => p.page === page)
  return (found ?? pages[0]).cid
}

// 过滤出广告类别、剔除非法区间,并按 cid 匹配:
// - 段带 cid 时必须与当前分 P 一致
// - 段不带 cid 时只在单 P 视频下采用(多 P 下归属不明,跳错位置比漏跳更糟)
export function filterSponsorSegments(
  segments: unknown,
  cid: number | null,
  pageCount: number,
): SponsorSegment[] {
  if (!Array.isArray(segments))
    return []
  return segments.filter((raw): raw is SponsorSegment => {
    const s = raw as SponsorSegment
    if (!SPONSOR_CATEGORIES.includes(s.category))
      return false
    if (!Array.isArray(s.segment) || s.segment.length !== 2)
      return false
    const [start, end] = s.segment
    if (typeof start !== 'number' || typeof end !== 'number')
      return false
    if (!(end > start) || start < 0)
      return false
    if (s.cid != null && cid != null && String(s.cid) !== String(cid))
      return false
    if (s.cid == null && pageCount > 1)
      return false
    return true
  })
}
