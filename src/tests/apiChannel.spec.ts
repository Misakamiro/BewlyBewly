import { describe, expect, it, vi } from 'vitest'

import { isBackgroundMessagingAvailable } from '~/utils/api'

vi.mock('webextension-polyfill', () => {
  const api = { runtime: { id: 'mock-extension-id' } }
  return { ...api, default: api }
})

describe('background messaging availability', () => {
  it('allows messaging on a healthy extension context', () => {
    expect(isBackgroundMessagingAvailable()).toBe(true)
  })
})
