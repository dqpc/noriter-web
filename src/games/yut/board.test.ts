import { describe, expect, it } from 'vitest'
import { stepsBetween } from './board'

describe('stepsBetween', () => {
  it('walks forward along the ring', () => {
    expect(stepsBetween('RING', 1, { path: 'RING', index: 4, node: 4, finished: false })).toEqual([2, 3, 4])
  })
  it('turns onto the shortcut when passing the corner', () => {
    expect(stepsBetween('RING', 3, { path: 'A', index: 2, node: 21, finished: false })).toEqual([4, 5, 20, 21])
  })
  it('backdo from a corner goes straight to the previous ring node instead of around the board', () => {
    expect(stepsBetween('A', 0, { path: 'RING', index: 4, node: 4, finished: false })).toEqual([4])
    expect(stepsBetween('B', 0, { path: 'RING', index: 9, node: 9, finished: false })).toEqual([9])
  })
  it('backdo on the same path is one node', () => {
    expect(stepsBetween('RING', 7, { path: 'RING', index: 6, node: 6, finished: false })).toEqual([6])
  })
})
