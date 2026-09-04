import { describe, expect, it } from 'vitest'
import { formatDuration } from './time'

describe('formatDuration', () => {
  it('mm:ss.sss', () => {
    expect(formatDuration(0)).toBe('00:00.000')
    expect(formatDuration(1234)).toBe('00:01.234')
    expect(formatDuration(61_005)).toBe('01:01.005')
    expect(formatDuration(3_599_999)).toBe('59:59.999')
    expect(formatDuration(-5)).toBe('00:00.000')
  })
})
