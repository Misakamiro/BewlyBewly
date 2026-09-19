import { describe, expect, it } from 'vitest'

import {
  filterSponsorSegments,
  getPageNumberFromSearch,
  parseBvidFromPath,
  resolveCid,
} from '~/utils/sponsorBlock'

const validSegment = {
  segment: [30, 90],
  category: 'sponsor',
  actionType: 'skip',
  UUID: 'uuid-1',
  cid: '168885122',
}

describe('parseBvidFromPath', () => {
  it('parses bvid from video page paths', () => {
    expect(parseBvidFromPath('/video/BV14741127BN/')).toBe('BV14741127BN')
    expect(parseBvidFromPath('/video/BV14741127BN?p=2')).toBe('BV14741127BN')
  })

  it('returns null for non-video or malformed paths', () => {
    expect(parseBvidFromPath('/')).toBe(null)
    expect(parseBvidFromPath('/anime/')).toBe(null)
    expect(parseBvidFromPath('/video/av170001/')).toBe(null)
  })
})

describe('getPageNumberFromSearch', () => {
  it('defaults to 1 when p is absent or invalid', () => {
    expect(getPageNumberFromSearch('')).toBe(1)
    expect(getPageNumberFromSearch('?p=abc')).toBe(1)
    expect(getPageNumberFromSearch('?p=0')).toBe(1)
    expect(getPageNumberFromSearch('?p=-1')).toBe(1)
  })

  it('parses positive part numbers', () => {
    expect(getPageNumberFromSearch('?p=2')).toBe(2)
    expect(getPageNumberFromSearch('?bvid=BVx&p=12')).toBe(12)
  })
})

describe('resolveCid', () => {
  const pages = [
    { cid: 111, page: 1 },
    { cid: 222, page: 2 },
  ]

  it('matches the requested part and falls back to the first part', () => {
    expect(resolveCid(pages, 2)).toBe(222)
    expect(resolveCid(pages, 9)).toBe(111)
  })

  it('returns null for empty or missing page lists', () => {
    expect(resolveCid([], 1)).toBe(null)
    expect(resolveCid(undefined, 1)).toBe(null)
  })
})

describe('filterSponsorSegments', () => {
  it('keeps sponsor/selfpromo segments with matching cid', () => {
    const out = filterSponsorSegments([validSegment], 168885122, 1)
    expect(out).toHaveLength(1)
    expect(out[0].UUID).toBe('uuid-1')
  })

  it('drops other categories and malformed ranges', () => {
    const out = filterSponsorSegments([
      { ...validSegment, category: 'interaction' },
      { ...validSegment, segment: [90, 30] },
      { ...validSegment, segment: [-5, 10] },
      { ...validSegment, segment: [10] },
      validSegment,
    ], 168885122, 1)
    expect(out).toHaveLength(1)
  })

  it('drops cid-mismatched segments on multi-part videos', () => {
    const out = filterSponsorSegments([validSegment], 999, 2)
    expect(out).toHaveLength(0)
  })

  it('adopts cid-less segments only on single-part videos', () => {
    const noCid = { ...validSegment, cid: undefined }
    expect(filterSponsorSegments([noCid], 168885122, 1)).toHaveLength(1)
    expect(filterSponsorSegments([noCid], 168885122, 2)).toHaveLength(0)
  })

  it('returns empty array for non-array payloads', () => {
    expect(filterSponsorSegments(null, null, 1)).toEqual([])
    expect(filterSponsorSegments({ error: true }, null, 1)).toEqual([])
  })
})
