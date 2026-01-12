import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { roll } from './dice'
import { ParseError } from '../errors'

// Helper to mock Math.random with predictable sequence
function mockRandomSequence(values: number[]) {
  let index = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[index % values.length]
    index++
    return value
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('roll(notation)', () => {
  describe('basic rolling', () => {
    it('roll("1d6") returns total between 1-6', () => {
      // Test with different random values
      for (let i = 0; i < 10; i++) {
        const result = roll('1d6')
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(6)
      }
    })

    it('roll("1d20") returns total between 1-20', () => {
      for (let i = 0; i < 10; i++) {
        const result = roll('1d20')
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(20)
      }
    })

    it('roll("2d6") returns total between 2-12', () => {
      for (let i = 0; i < 10; i++) {
        const result = roll('2d6')
        expect(result.total).toBeGreaterThanOrEqual(2)
        expect(result.total).toBeLessThanOrEqual(12)
      }
    })

    it('roll("3d8") returns total between 3-24', () => {
      for (let i = 0; i < 10; i++) {
        const result = roll('3d8')
        expect(result.total).toBeGreaterThanOrEqual(3)
        expect(result.total).toBeLessThanOrEqual(24)
      }
    })

    it('roll("1d1") always returns total of 1', () => {
      const result = roll('1d1')
      expect(result.total).toBe(1)
    })

    it('roll("10d10") returns total between 10-100', () => {
      for (let i = 0; i < 5; i++) {
        const result = roll('10d10')
        expect(result.total).toBeGreaterThanOrEqual(10)
        expect(result.total).toBeLessThanOrEqual(100)
      }
    })

    it('roll("d20") without leading number returns total between 1-20 (implied 1)', () => {
      for (let i = 0; i < 10; i++) {
        const result = roll('d20')
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(20)
      }
    })

    it('roll("d6") without leading number returns total between 1-6 (implied 1)', () => {
      for (let i = 0; i < 10; i++) {
        const result = roll('d6')
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(6)
      }
    })
  })

  describe('return object structure', () => {
    beforeEach(() => {
      mockRandomSequence([0.5, 0.8])
    })

    it('result.total equals sum of result.kept (or result.rolls if no keep/drop)', () => {
      const result = roll('2d6')
      const sum = result.kept.reduce((a, b) => a + b, 0)
      expect(result.total - result.modifier).toBe(sum)
    })

    it('result.rolls contains all individual die results', () => {
      const result = roll('3d6')
      expect(result.rolls).toHaveLength(3)
      expect(result.rolls.every(r => r >= 1 && r <= 6)).toBe(true)
    })

    it('result.rolls.length equals number of dice rolled', () => {
      const result = roll('4d6')
      expect(result.rolls).toHaveLength(4)
    })

    it('result.kept equals result.rolls when no keep/drop modifiers', () => {
      const result = roll('2d6')
      expect(result.kept).toEqual(result.rolls)
    })

    it('result.notation echoes the input notation', () => {
      const result = roll('1d20+5')
      expect(result.notation).toBe('1d20+5')
    })

    it('result.modifier is 0 when no numeric modifiers present', () => {
      const result = roll('1d6')
      expect(result.modifier).toBe(0)
    })
  })

  describe('addition and subtraction', () => {
    beforeEach(() => {
      mockRandomSequence([0.5]) // d20: 11, d6: 4
    })

    it('roll("1d20+5") adds 5 to total', () => {
      const result = roll('1d20+5')
      expect(result.total).toBe(11 + 5)
      expect(result.modifier).toBe(5)
    })

    it('roll("1d20-3") subtracts 3 from total', () => {
      const result = roll('1d20-3')
      expect(result.total).toBe(11 - 3)
      expect(result.modifier).toBe(-3)
    })

    it('roll("2d6+10") adds 10 to sum of dice', () => {
      mockRandomSequence([0.5, 0.5])
      const result = roll('2d6+10')
      expect(result.total).toBe(4 + 4 + 10)
      expect(result.modifier).toBe(10)
    })

    it('roll("1d20+0") works correctly (no change to total)', () => {
      const result = roll('1d20+0')
      expect(result.total).toBe(11)
      expect(result.modifier).toBe(0)
    })

    it('roll("1d6-10") can result in negative total', () => {
      const result = roll('1d6-10')
      expect(result.total).toBe(4 - 10)
      expect(result.total).toBeLessThan(0)
    })

    it('modifier is stored in result.modifier, not in result.rolls', () => {
      const result = roll('1d20+5')
      expect(result.modifier).toBe(5)
      expect(result.rolls).not.toContain(5)
      expect(result.rolls.every(r => r >= 1 && r <= 20)).toBe(true)
    })

    it('result.rolls contains only actual die values, unaffected by modifier', () => {
      const result = roll('2d6+10')
      expect(result.rolls).toHaveLength(2)
      expect(result.rolls.every(r => r >= 1 && r <= 6)).toBe(true)
    })
  })

  describe('multiple modifiers', () => {
    beforeEach(() => {
      mockRandomSequence([0.5]) // d20: 11
    })

    it('roll("1d20+5+3") sums modifiers: total = roll + 8', () => {
      const result = roll('1d20+5+3')
      expect(result.total).toBe(11 + 8)
      expect(result.modifier).toBe(8)
    })

    it('roll("1d20+5-2") handles mixed modifiers: total = roll + 3', () => {
      const result = roll('1d20+5-2')
      expect(result.total).toBe(11 + 3)
      expect(result.modifier).toBe(3)
    })

    it('roll("1d20-2-3") handles multiple subtractions: total = roll - 5', () => {
      const result = roll('1d20-2-3')
      expect(result.total).toBe(11 - 5)
      expect(result.modifier).toBe(-5)
    })

    it('roll("1d20+10-5+2-1") handles complex chains: total = roll + 6', () => {
      const result = roll('1d20+10-5+2-1')
      expect(result.total).toBe(11 + 6)
      expect(result.modifier).toBe(6)
    })

    it('result.modifier reflects the sum of all numeric modifiers', () => {
      const result = roll('1d20+5+3-2')
      expect(result.modifier).toBe(6)
    })
  })

  describe('keep highest (kh)', () => {
    it('roll("4d6kh3") keeps highest 3 of 4 rolls', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999]) // 1, 3, 5, 6
      const result = roll('4d6kh3')
      expect(result.rolls).toHaveLength(4)
      expect(result.kept).toHaveLength(3)
      expect(result.kept).toEqual([3, 5, 6])
      expect(result.total).toBe(3 + 5 + 6)
    })

    it('roll("2d20kh1") keeps highest 1 (advantage roll)', () => {
      mockRandomSequence([0.1, 0.8]) // 3, 17
      const result = roll('2d20kh1')
      expect(result.kept).toEqual([17])
      expect(result.total).toBe(17)
    })

    it('roll("5d6kh2") keeps highest 2 of 5 rolls', () => {
      mockRandomSequence([0.1, 0.2, 0.5, 0.7, 0.9]) // 1, 2, 4, 5, 6
      const result = roll('5d6kh2')
      expect(result.kept).toEqual([5, 6])
      expect(result.total).toBe(11)
    })

    it('result.rolls contains all 4 original rolls', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6kh3')
      expect(result.rolls).toHaveLength(4)
    })

    it('result.kept contains only the 3 highest values', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6kh3')
      expect(result.kept).toHaveLength(3)
      expect(result.kept).toEqual([3, 5, 6])
    })

    it('result.total equals sum of result.kept', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6kh3')
      const sum = result.kept.reduce((a, b) => a + b, 0)
      expect(result.total).toBe(sum)
    })
  })

  describe('keep lowest (kl)', () => {
    it('roll("4d6kl3") keeps lowest 3 of 4 rolls', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999]) // 1, 3, 5, 6
      const result = roll('4d6kl3')
      expect(result.kept).toEqual([1, 3, 5])
      expect(result.total).toBe(9)
    })

    it('roll("2d20kl1") keeps lowest 1 (disadvantage roll)', () => {
      mockRandomSequence([0.1, 0.8]) // 3, 17
      const result = roll('2d20kl1')
      expect(result.kept).toEqual([3])
      expect(result.total).toBe(3)
    })

    it('roll("5d6kl2") keeps lowest 2 of 5 rolls', () => {
      mockRandomSequence([0.1, 0.2, 0.5, 0.7, 0.9]) // 1, 2, 4, 5, 6
      const result = roll('5d6kl2')
      expect(result.kept).toEqual([1, 2])
      expect(result.total).toBe(3)
    })

    it('result.kept contains only the lowest values', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6kl2')
      expect(result.kept).toEqual([1, 3])
    })
  })

  describe('drop highest (dh)', () => {
    it('roll("4d6dh1") drops highest 1, equivalent to kl3', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999]) // 1, 3, 5, 6
      const result = roll('4d6dh1')
      expect(result.kept).toEqual([1, 3, 5])
      expect(result.total).toBe(9)
    })

    it('roll("5d6dh2") drops highest 2, keeps lowest 3', () => {
      mockRandomSequence([0.1, 0.2, 0.5, 0.7, 0.9]) // 1, 2, 4, 5, 6
      const result = roll('5d6dh2')
      expect(result.kept).toEqual([1, 2, 4])
      expect(result.total).toBe(7)
    })

    it('result.kept excludes the dropped dice', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6dh1')
      expect(result.kept).not.toContain(6)
    })
  })

  describe('drop lowest (dl)', () => {
    it('roll("4d6dl1") drops lowest 1, equivalent to kh3', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999]) // 1, 3, 5, 6
      const result = roll('4d6dl1')
      expect(result.kept).toEqual([3, 5, 6])
      expect(result.total).toBe(14)
    })

    it('roll("5d6dl2") drops lowest 2, keeps highest 3', () => {
      mockRandomSequence([0.1, 0.2, 0.5, 0.7, 0.9]) // 1, 2, 4, 5, 6
      const result = roll('5d6dl2')
      expect(result.kept).toEqual([4, 5, 6])
      expect(result.total).toBe(15)
    })
  })

  describe('edge cases for keep/drop', () => {
    it('roll("2d6kh5") clamps to actual dice count (keeps all 2)', () => {
      mockRandomSequence([0.3, 0.7])
      const result = roll('2d6kh5')
      expect(result.kept).toHaveLength(2)
      expect(result.kept).toEqual(result.rolls)
    })

    it('roll("3d6kh10") clamps to actual dice count (keeps all 3)', () => {
      mockRandomSequence([0.2, 0.5, 0.8])
      const result = roll('3d6kh10')
      expect(result.kept).toHaveLength(3)
    })

    it('roll("4d6kl0") keeps none, total is 0', () => {
      mockRandomSequence([0.2, 0.4, 0.6, 0.8])
      const result = roll('4d6kl0')
      expect(result.kept).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('roll("4d6kh0") keeps none, total is 0', () => {
      mockRandomSequence([0.2, 0.4, 0.6, 0.8])
      const result = roll('4d6kh0')
      expect(result.kept).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('roll("2d6dh5") drops all, total is 0', () => {
      mockRandomSequence([0.3, 0.7])
      const result = roll('2d6dh5')
      expect(result.kept).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('result.kept is empty array when all dice dropped', () => {
      mockRandomSequence([0.2, 0.4, 0.6])
      const result = roll('3d6kh0')
      expect(result.kept).toEqual([])
    })
  })

  describe('basic exploding', () => {
    it('roll("1d6!") rerolls and adds when rolling max value (6)', () => {
      mockRandomSequence([0.999, 0.3]) // 6, then 3
      const result = roll('1d6!')
      expect(result.total).toBe(9)
      expect(result.rolls).toContain(6)
      expect(result.rolls).toContain(3)
    })

    it('roll("1d20!") rerolls and adds when rolling 20', () => {
      mockRandomSequence([0.999, 0.5]) // 20, then 11
      const result = roll('1d20!')
      expect(result.total).toBe(31)
    })

    it('exploding can chain: rolling 6, then 6, then 3 = total of 15', () => {
      mockRandomSequence([0.999, 0.999, 0.3]) // 6, 6, 3
      const result = roll('1d6!')
      expect(result.total).toBe(15)
    })

    it('result.rolls includes all rolls including explosions', () => {
      mockRandomSequence([0.999, 0.3])
      const result = roll('1d6!')
      expect(result.rolls.length).toBeGreaterThan(1)
    })

    it('result.rolls.length can exceed original dice count due to explosions', () => {
      mockRandomSequence([0.999, 0.999, 0.3])
      const result = roll('1d6!')
      expect(result.rolls.length).toBeGreaterThan(1)
    })
  })

  describe('explosion limits', () => {
    it('explosions have a maximum chain depth of 100 (prevent infinite loops)', () => {
      mockRandomSequence(Array(150).fill(0.999)) // All max values
      const result = roll('1d6!')
      expect(result.rolls.length).toBeLessThanOrEqual(100)
    })

    it('after hitting limit, stops exploding and returns current total', () => {
      mockRandomSequence(Array(150).fill(0.999))
      const result = roll('1d6!')
      expect(result.total).toBe(600) // 100 rolls of 6
    })

    it('result includes all rolls up to the limit', () => {
      mockRandomSequence(Array(150).fill(0.999))
      const result = roll('1d6!')
      expect(result.rolls.length).toBe(100)
    })
  })

  describe('exploding with other modifiers', () => {
    it('roll("1d6!+3") adds modifier after all explosions resolved', () => {
      mockRandomSequence([0.999, 0.3]) // 6, 3 = 9
      const result = roll('1d6!+3')
      expect(result.total).toBe(12)
      expect(result.modifier).toBe(3)
    })

    it('roll("2d6!") each die can explode independently', () => {
      mockRandomSequence([0.999, 0.3, 0.999, 0.5]) // First die: 6, 3. Second die: 6, 4
      const result = roll('2d6!')
      expect(result.total).toBe(19) // 9 + 10
    })

    it('roll("4d6!kh3") exploding happens before keep/drop selection', () => {
      mockRandomSequence([0.1, 0.999, 0.3, 0.5, 0.7]) // 1, 6, 3, 4, 5
      const result = roll('4d6!kh3')
      // Die 1: 1, Die 2: 6->3=9, Die 3: 4, Die 4: 5
      // Keep highest 3: 9, 5, 4 = 18
      expect(result.total).toBe(18)
    })
  })

  describe('basic reroll syntax', () => {
    it('roll("1d6r1") rerolls ones (shorthand for r=1)', () => {
      mockRandomSequence([0.0, 0.5]) // 1, then 4
      const result = roll('1d6r1')
      expect(result.rolls).toContain(1)
      expect(result.rolls).toContain(4)
      expect(result.total).toBe(4)
    })

    it('roll("1d6r=1") rerolls exactly 1', () => {
      mockRandomSequence([0.0, 0.5])
      const result = roll('1d6r=1')
      expect(result.total).toBe(4)
    })

    it('roll("1d6r=6") rerolls exactly 6', () => {
      mockRandomSequence([0.999, 0.5])
      const result = roll('1d6r=6')
      expect(result.total).toBe(4)
    })

    it('roll("2d6r1") rerolls ones on each die independently', () => {
      mockRandomSequence([0.0, 0.5, 0.5, 0.7]) // Die 1: 1->4, Die 2: 4
      const result = roll('2d6r1')
      expect(result.total).toBe(8)
    })
  })

  describe('comparison operators', () => {
    it('roll("1d6r<3") rerolls values less than 3 (rerolls 1 and 2)', () => {
      mockRandomSequence([0.1, 0.5]) // 1, then 4
      const result = roll('1d6r<3')
      expect(result.total).toBe(4)
    })

    it('roll("1d6r<=3") rerolls values less than or equal to 3 (rerolls 1, 2, 3)', () => {
      mockRandomSequence([0.33, 0.7]) // 3, then 5
      const result = roll('1d6r<=3')
      expect(result.total).toBe(5)
    })

    it('roll("1d6r>4") rerolls values greater than 4 (rerolls 5 and 6)', () => {
      mockRandomSequence([0.8, 0.3]) // 5, then 3
      const result = roll('1d6r>4')
      expect(result.total).toBe(3)
    })

    it('roll("1d6r>=4") rerolls values greater than or equal to 4 (rerolls 4, 5, 6)', () => {
      mockRandomSequence([0.5, 0.1]) // 4, then 1
      const result = roll('1d6r>=4')
      expect(result.total).toBe(1)
    })
  })

  describe('reroll behavior', () => {
    it('reroll happens exactly once per die (no infinite loops)', () => {
      mockRandomSequence([0.0, 0.0, 0.0]) // All 1s
      const result = roll('1d6r1')
      expect(result.rolls).toHaveLength(2) // Original + one reroll
    })

    it('second result stands even if it matches reroll condition', () => {
      mockRandomSequence([0.0, 0.0]) // Both 1s
      const result = roll('1d6r1')
      expect(result.total).toBe(1) // Keeps the second 1
    })

    it('roll("1d6r<3") that rerolls a 2 and gets a 1 keeps the 1', () => {
      mockRandomSequence([0.16, 0.0]) // 2, then 1
      const result = roll('1d6r<3')
      expect(result.total).toBe(1)
    })

    it('result.rolls includes both original and rerolled values', () => {
      mockRandomSequence([0.0, 0.5])
      const result = roll('1d6r1')
      expect(result.rolls).toHaveLength(2)
    })
  })

  describe('multiple reroll conditions', () => {
    it('roll("1d6r1r2") rerolls both 1s and 2s', () => {
      mockRandomSequence([0.0, 0.5]) // 1, then 4
      const result = roll('1d6r1r2')
      expect(result.total).toBe(4)
    })

    it('roll("1d6r<2r>5") rerolls 1s and 6s', () => {
      mockRandomSequence([0.999, 0.5]) // 6, then 4
      const result = roll('1d6r<2r>5')
      expect(result.total).toBe(4)
    })

    it('multiple conditions checked independently, still only one reroll per die', () => {
      mockRandomSequence([0.0, 0.0]) // Both 1s
      const result = roll('1d6r1r2')
      expect(result.rolls).toHaveLength(2)
      expect(result.total).toBe(1)
    })
  })

  describe('keep/drop with numeric modifiers', () => {
    it('roll("4d6kh3+2") keeps highest 3, then adds 2', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999]) // 1, 3, 5, 6
      const result = roll('4d6kh3+2')
      expect(result.total).toBe(14 + 2)
    })

    it('roll("2d20kh1+5") advantage with +5 modifier', () => {
      mockRandomSequence([0.1, 0.8]) // 3, 17
      const result = roll('2d20kh1+5')
      expect(result.total).toBe(17 + 5)
    })

    it('roll("4d6dl1-2") drops lowest, then subtracts 2', () => {
      mockRandomSequence([0.0, 0.33, 0.66, 0.999])
      const result = roll('4d6dl1-2')
      expect(result.total).toBe(14 - 2)
    })
  })

  describe('exploding with keep/drop', () => {
    it('roll("4d6!kh3") exploding resolves first, then keep highest 3', () => {
      mockRandomSequence([0.1, 0.999, 0.3, 0.5, 0.7]) // 1, 6->3=9, 4, 5
      const result = roll('4d6!kh3')
      expect(result.rolls.length).toBeGreaterThan(4)
      expect(result.kept).toHaveLength(3)
    })

    it('result.rolls may have more than 4 entries due to explosions', () => {
      mockRandomSequence([0.1, 0.999, 0.3, 0.5, 0.7])
      const result = roll('4d6!kh3')
      expect(result.rolls.length).toBeGreaterThan(4)
    })

    it('result.kept has exactly 3 entries (highest values)', () => {
      mockRandomSequence([0.1, 0.999, 0.3, 0.5, 0.7])
      const result = roll('4d6!kh3')
      expect(result.kept).toHaveLength(3)
    })
  })

  describe('exploding with reroll', () => {
    it('roll("1d6!r1") order: roll → explode → reroll', () => {
      mockRandomSequence([0.999, 0.0, 0.5]) // 6, 1, 4
      const result = roll('1d6!r1')
      // First roll: 6 (explodes), second roll: 1 (rerolls), third roll: 4
      expect(result.total).toBe(10) // 6 + 4
    })

    it('explosions happen on max value, then reroll conditions checked', () => {
      mockRandomSequence([0.999, 0.0, 0.5])
      const result = roll('1d6!r1')
      expect(result.rolls).toContain(6)
      expect(result.rolls).toContain(1)
      expect(result.rolls).toContain(4)
    })

    it('roll("2d6!r<3") each die explodes and rerolls independently', () => {
      mockRandomSequence([0.999, 0.5, 0.1, 0.5]) // Die 1: 6->4, Die 2: 1->4
      const result = roll('2d6!r<3')
      expect(result.total).toBe(14) // 10 + 4
    })
  })

  describe('complex combinations', () => {
    it('roll("4d6!kh3+2") explode, keep highest 3, add 2', () => {
      mockRandomSequence([0.1, 0.999, 0.3, 0.5, 0.7]) // 1, 6->3=9, 4, 5
      const result = roll('4d6!kh3+2')
      expect(result.total).toBe(18 + 2)
    })

    it('roll("4d6r1kh3") reroll 1s, then keep highest 3', () => {
      mockRandomSequence([0.0, 0.5, 0.33, 0.66, 0.999]) // 1->4, 3, 5, 6
      const result = roll('4d6r1kh3')
      expect(result.total).toBe(15) // 6 + 5 + 4
    })

    it('roll("2d20kh1+5-2") advantage with net +3 modifier', () => {
      mockRandomSequence([0.1, 0.8])
      const result = roll('2d20kh1+5-2')
      expect(result.total).toBe(17 + 3)
    })
  })

  describe('valid notation variations', () => {
    beforeEach(() => {
      mockRandomSequence([0.5])
    })

    it('roll("1D20") uppercase D is valid, case insensitive', () => {
      const result = roll('1D20')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(20)
    })

    it('roll("1d20") lowercase d is valid', () => {
      const result = roll('1d20')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(20)
    })

    it('roll("1D6KH3") all uppercase is valid', () => {
      mockRandomSequence([0.2, 0.5, 0.8])
      const result = roll('3D6KH2')
      expect(result.kept).toHaveLength(2)
    })

    it('roll(" 1d20 ") leading/trailing whitespace is ignored', () => {
      const result = roll(' 1d20 ')
      expect(result.notation).toBe(' 1d20 ')
      expect(result.rolls).toHaveLength(1)
    })

    it('roll("1d20 + 5") spaces around operators are ignored', () => {
      const result = roll('1d20 + 5')
      expect(result.modifier).toBe(5)
    })

    it('roll("1d20+ 5") space after operator is ignored', () => {
      const result = roll('1d20+ 5')
      expect(result.modifier).toBe(5)
    })

    it('roll("1d20 +5") space before operator is ignored', () => {
      const result = roll('1d20 +5')
      expect(result.modifier).toBe(5)
    })

    it('roll("  2d6  +  3  ") multiple spaces throughout are ignored', () => {
      const result = roll('  2d6  +  3  ')
      expect(result.modifier).toBe(3)
    })
  })

  describe('invalid notation', () => {
    it('roll("abc") throws ParseError with descriptive message', () => {
      expect(() => roll('abc')).toThrow(ParseError)
    })

    it('roll("0d6") throws ParseError: cannot roll zero dice', () => {
      expect(() => roll('0d6')).toThrow(ParseError)
      expect(() => roll('0d6')).toThrow(/cannot roll zero dice/i)
    })

    it('roll("1d0") throws ParseError: die must have at least 1 side', () => {
      expect(() => roll('1d0')).toThrow(ParseError)
      expect(() => roll('1d0')).toThrow(/at least 1 side/i)
    })

    it('roll("-1d6") throws ParseError: cannot roll negative dice', () => {
      expect(() => roll('-1d6')).toThrow(ParseError)
      expect(() => roll('-1d6')).toThrow(/negative/i)
    })

    it('roll("1d-6") throws ParseError: die cannot have negative sides', () => {
      expect(() => roll('1d-6')).toThrow(ParseError)
      expect(() => roll('1d-6')).toThrow(/negative/i)
    })

    it('roll("") throws ParseError: empty notation', () => {
      expect(() => roll('')).toThrow(ParseError)
    })

    it('roll("d") throws ParseError: incomplete notation', () => {
      expect(() => roll('d')).toThrow(ParseError)
    })

    it('roll("1d") throws ParseError: missing die size', () => {
      expect(() => roll('1d')).toThrow(ParseError)
    })

    it('roll("1d20+") throws ParseError: incomplete modifier', () => {
      expect(() => roll('1d20+')).toThrow(ParseError)
    })

    it('roll("1d20+2.5") throws ParseError: modifiers must be integers', () => {
      expect(() => roll('1d20+2.5')).toThrow(ParseError)
    })

    it('roll("1d20.5") throws ParseError: die size must be integer', () => {
      expect(() => roll('1d20.5')).toThrow(ParseError)
    })

    it('roll("1.5d20") throws ParseError: dice count must be integer', () => {
      expect(() => roll('1.5d20')).toThrow(ParseError)
    })

    it('roll("1d20++5") throws ParseError: invalid modifier syntax', () => {
      expect(() => roll('1d20++5')).toThrow(ParseError)
    })

    it('roll("1d20+-5") throws ParseError: invalid modifier syntax', () => {
      expect(() => roll('1d20+-5')).toThrow(ParseError)
    })
  })

  describe('large numbers', () => {
    it('roll("100d100") handles large dice pools', () => {
      const result = roll('100d100')
      expect(result.rolls).toHaveLength(100)
      expect(result.total).toBeGreaterThanOrEqual(100)
      expect(result.total).toBeLessThanOrEqual(10000)
    })

    it('roll("1d1000") handles large die size', () => {
      const result = roll('1d1000')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(1000)
    })

    it('roll("1d20+1000000") handles large modifiers', () => {
      const result = roll('1d20+1000000')
      expect(result.total).toBeGreaterThanOrEqual(1000001)
      expect(result.total).toBeLessThanOrEqual(1000020)
    })

    it('performance: 100d100 completes in under 100ms', () => {
      const start = Date.now()
      roll('100d100')
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(100)
    })
  })
})
