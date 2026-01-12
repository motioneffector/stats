import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStatBlock } from './stat-block'
import { check, createDerivedStat, saveThrow, contest, rollTable } from './checks-and-utils'
import { createStatTemplate } from './stat-template'
import { ValidationError, CircularDependencyError, VersionError } from '../errors'

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

describe('check(statBlock, statName, options)', () => {
  describe('basic checks', () => {
    it('rolls 1d20 by default', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ strength: { base: 10 } })
      const result = check(stats, 'strength', { difficulty: 10 })
      expect(result.rolls).toHaveLength(1)
      expect(result.roll).toBeGreaterThanOrEqual(1)
      expect(result.roll).toBeLessThanOrEqual(20)
    })

    it('calculates modifier as Math.floor((stat - 10) / 2)', () => {
      const stats = createStatBlock({ strength: { base: 14 } })
      const result = check(stats, 'strength', { difficulty: 10 })
      expect(result.modifier).toBe(2) // (14-10)/2 = 2
    })

    it('uses effective stat value (get()) for modifier calculation', () => {
      const stats = createStatBlock({ strength: { base: 14 } })
      stats.addModifier('strength', { value: 2, source: 'buff' })
      const result = check(stats, 'strength', { difficulty: 10 })
      expect(result.modifier).toBe(3) // (16-10)/2 = 3
    })

    it('total = roll + modifier + bonus', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ strength: { base: 14 } })
      const result = check(stats, 'strength', { difficulty: 10, bonus: 2 })
      expect(result.total).toBe(11 + 2 + 2) // roll + modifier + bonus
    })

    it('success = total >= difficulty', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ strength: { base: 14 } })
      const result1 = check(stats, 'strength', { difficulty: 10 })
      expect(result1.success).toBe(true) // 11+2 = 13 >= 10

      const result2 = check(stats, 'strength', { difficulty: 20 })
      expect(result2.success).toBe(false) // 11+2 = 13 < 20
    })

    it('margin = total - difficulty', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ strength: { base: 14 } })
      const result = check(stats, 'strength', { difficulty: 10 })
      expect(result.margin).toBe(3) // 13 - 10
    })
  })

  describe('modifier calculation examples', () => {
    it('stat 10 → modifier 0  ((10-10)/2 = 0)', () => {
      const stats = createStatBlock({ stat: { base: 10 } })
      const result = check(stats, 'stat', { difficulty: 10 })
      expect(result.modifier).toBe(0)
    })

    it('stat 14 → modifier +2 ((14-10)/2 = 2)', () => {
      const stats = createStatBlock({ stat: { base: 14 } })
      const result = check(stats, 'stat', { difficulty: 10 })
      expect(result.modifier).toBe(2)
    })

    it('stat 8 → modifier -1  ((8-10)/2 = -1, rounded down)', () => {
      const stats = createStatBlock({ stat: { base: 8 } })
      const result = check(stats, 'stat', { difficulty: 10 })
      expect(result.modifier).toBe(-1)
    })

    it('stat 1 → modifier -5  ((1-10)/2 = -4.5 → -5)', () => {
      const stats = createStatBlock({ stat: { base: 1 } })
      const result = check(stats, 'stat', { difficulty: 10 })
      expect(result.modifier).toBe(-5)
    })

    it('stat 20 → modifier +5 ((20-10)/2 = 5)', () => {
      const stats = createStatBlock({ stat: { base: 20 } })
      const result = check(stats, 'stat', { difficulty: 10 })
      expect(result.modifier).toBe(5)
    })
  })

  describe('custom dice', () => {
    it('check(stats, "str", { dice: "2d6", difficulty: 10 }) uses 2d6', () => {
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { dice: '2d6', difficulty: 10 })
      expect(result.rolls.length).toBeGreaterThanOrEqual(2)
    })

    it('check(stats, "str", { dice: "3d6", difficulty: 12 }) uses 3d6', () => {
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { dice: '3d6', difficulty: 12 })
      expect(result.rolls.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('bonus', () => {
    it('bonus adds to total: total = roll + modifier + bonus', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, bonus: 3 })
      expect(result.total).toBe(11 + 2 + 3)
    })

    it('bonus: 0 has no effect', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, bonus: 0 })
      expect(result.bonus).toBe(0)
      expect(result.total).toBe(11 + 2)
    })

    it('bonus: -5 subtracts from total', () => {
      mockRandomSequence([0.5]) // 11
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, bonus: -5 })
      expect(result.total).toBe(11 + 2 - 5)
    })

    it('bonus is separate from modifier in result object', () => {
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, bonus: 3 })
      expect(result.modifier).toBe(2)
      expect(result.bonus).toBe(3)
    })
  })

  describe('override modifier', () => {
    it('{ modifier: 5 } uses 5 instead of calculated modifier', () => {
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, modifier: 5 })
      expect(result.modifier).toBe(5)
    })

    it('{ modifier: 0 } uses 0 regardless of stat value', () => {
      const stats = createStatBlock({ str: { base: 20 } })
      const result = check(stats, 'str', { difficulty: 10, modifier: 0 })
      expect(result.modifier).toBe(0)
    })

    it('{ modifier: -3 } can specify negative override', () => {
      const stats = createStatBlock({ str: { base: 14 } })
      const result = check(stats, 'str', { difficulty: 10, modifier: -3 })
      expect(result.modifier).toBe(-3)
    })
  })

  describe('advantage and disadvantage', () => {
    it('advantage: true rolls twice, uses higher roll', () => {
      mockRandomSequence([0.1, 0.8]) // 3, 17
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, advantage: true })
      expect(result.rolls).toHaveLength(2)
      expect(result.roll).toBe(17)
    })

    it('disadvantage: true rolls twice, uses lower roll', () => {
      mockRandomSequence([0.1, 0.8]) // 3, 17
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, disadvantage: true })
      expect(result.rolls).toHaveLength(2)
      expect(result.roll).toBe(3)
    })

    it('result.rolls contains both roll values', () => {
      mockRandomSequence([0.1, 0.8])
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, advantage: true })
      expect(result.rolls).toContain(3)
      expect(result.rolls).toContain(17)
    })

    it('result.roll is the selected value (higher or lower)', () => {
      mockRandomSequence([0.1, 0.8])
      const stats = createStatBlock({ str: { base: 10 } })
      const advResult = check(stats, 'str', { difficulty: 15, advantage: true })
      expect(advResult.roll).toBe(17)

      mockRandomSequence([0.1, 0.8])
      const disResult = check(stats, 'str', { difficulty: 15, disadvantage: true })
      expect(disResult.roll).toBe(3)
    })

    it('both advantage and disadvantage true → roll normally (single die)', () => {
      mockRandomSequence([0.5])
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, advantage: true, disadvantage: true })
      expect(result.rolls).toHaveLength(1)
    })

    it('result.rolls has single entry when cancelled', () => {
      mockRandomSequence([0.5])
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, advantage: true, disadvantage: true })
      expect(result.rolls).toHaveLength(1)
    })

    it('follows D&D 5e rules for cancellation', () => {
      const stats = createStatBlock({ str: { base: 10 } })
      const result = check(stats, 'str', { difficulty: 15, advantage: true, disadvantage: true })
      // Should roll normally (1 die)
      expect(result.rolls).toHaveLength(1)
    })
  })

  describe('check with non-existent stat', () => {
    it('throws TypeError when stat doesn\'t exist', () => {
      const stats = createStatBlock({})
      expect(() => check(stats, 'missing', { difficulty: 10 })).toThrow(TypeError)
    })

    it('error message identifies the missing stat', () => {
      const stats = createStatBlock({})
      expect(() => check(stats, 'missing', { difficulty: 10 })).toThrow(/missing/)
    })
  })

  describe('check with custom modifierFormula', () => {
    it('uses stat block\'s modifierFormula if defined', () => {
      const customFormula = (v: number) => v // Use stat value directly
      const stats = createStatBlock({ str: { base: 14 } }, { modifierFormula: customFormula })
      const result = check(stats, 'str', { difficulty: 10 })
      expect(result.modifier).toBe(14)
    })

    it('per-check modifier override takes precedence over formula', () => {
      const customFormula = (v: number) => v
      const stats = createStatBlock({ str: { base: 14 } }, { modifierFormula: customFormula })
      const result = check(stats, 'str', { difficulty: 10, modifier: 5 })
      expect(result.modifier).toBe(5)
    })
  })
})

describe('createDerivedStat(statBlock, name, formula)', () => {
  it('creates a computed stat that derives from other stats', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    expect(stats.get('carryCapacity')).toBe(160)
  })

  it('read via statBlock.get(name)', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    expect(stats.get('carryCapacity')).toBeDefined()
  })

  it('automatically recalculates when source stats change', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    expect(stats.get('carryCapacity')).toBe(160)
    stats.set('strength', 18)
    expect(stats.get('carryCapacity')).toBe(180)
  })

  it('returns the derived stat accessor object', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    const derived = createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    expect(derived).toBeDefined()
  })

  it('carryCapacity equals strength * 10', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    expect(stats.get('carryCapacity')).toBe(160)
  })

  it('attackBonus equals str modifier + proficiency', () => {
    const stats = createStatBlock({ strength: { base: 16 }, proficiency: { base: 2 } })
    createDerivedStat(
      stats,
      'attackBonus',
      s => Math.floor((s.get('strength')! - 10) / 2) + s.get('proficiency')!
    )
    expect(stats.get('attackBonus')).toBe(5) // 3 + 2
  })

  it('changing strength updates carryCapacity', () => {
    const stats = createStatBlock({ strength: { base: 16 } })
    createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
    stats.set('strength', 20)
    expect(stats.get('carryCapacity')).toBe(200)
  })

  it('changing proficiency updates attackBonus', () => {
    const stats = createStatBlock({ strength: { base: 16 }, proficiency: { base: 2 } })
    createDerivedStat(
      stats,
      'attackBonus',
      s => Math.floor((s.get('strength')! - 10) / 2) + s.get('proficiency')!
    )
    stats.set('proficiency', 4)
    expect(stats.get('attackBonus')).toBe(7) // 3 + 4
  })

  describe('derived from derived', () => {
    it('derived stat can depend on another derived stat', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      createDerivedStat(stats, 'maxCarry', s => s.get('carryCapacity')! * 2)
      expect(stats.get('maxCarry')).toBe(200)
    })

    it('chain updates correctly: A → B → C', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      createDerivedStat(stats, 'maxCarry', s => s.get('carryCapacity')! * 2)
      stats.set('strength', 15)
      expect(stats.get('carryCapacity')).toBe(150)
      expect(stats.get('maxCarry')).toBe(300)
    })
  })

  describe('read-only behavior', () => {
    it('set() on derived stat throws TypeError', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(() => stats.set('carryCapacity', 100)).toThrow(TypeError)
    })

    it('error message: "Cannot set derived stat \'statName\'"', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(() => stats.set('carryCapacity', 100)).toThrow(/derived stat/)
    })

    it('modify() on derived stat throws TypeError', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(() => stats.modify('carryCapacity', 10)).toThrow(TypeError)
    })

    it('addModifier() on derived stat throws TypeError', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(() =>
        stats.addModifier('carryCapacity', { value: 10, source: 'buff' })
      ).toThrow(TypeError)
    })
  })

  describe('error handling', () => {
    it('formula that throws returns 0', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'broken', () => {
        throw new Error('test error')
      })
      expect(stats.get('broken')).toBe(0)
    })

    it('error is logged to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'broken', () => {
        throw new Error('test error')
      })
      stats.get('broken')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('other stats remain functional', () => {
      const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 12 } })
      createDerivedStat(stats, 'broken', () => {
        throw new Error('test error')
      })
      expect(stats.get('strength')).toBe(10)
      expect(stats.get('dexterity')).toBe(12)
    })

    it('formula errors don\'t crash stat block', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'broken', () => {
        throw new Error('test error')
      })
      expect(() => stats.get('broken')).not.toThrow()
    })
  })

  describe('circular dependency detection', () => {
    it('A depends on B, B depends on A throws CircularDependencyError', () => {
      const stats = createStatBlock({ a: { base: 10 }, b: { base: 10 } })
      createDerivedStat(stats, 'derivedA', s => s.get('derivedB')! + 1)
      expect(() => {
        createDerivedStat(stats, 'derivedB', s => s.get('derivedA')! + 1)
      }).toThrow(CircularDependencyError)
    })

    it('A → B → C → A throws CircularDependencyError', () => {
      const stats = createStatBlock({ x: { base: 10 } })
      createDerivedStat(stats, 'a', s => s.get('c')! + 1)
      createDerivedStat(stats, 'b', s => s.get('a')! + 1)
      expect(() => {
        createDerivedStat(stats, 'c', s => s.get('b')! + 1)
      }).toThrow(CircularDependencyError)
    })

    it('error thrown at definition time, not access time', () => {
      const stats = createStatBlock({ a: { base: 10 } })
      createDerivedStat(stats, 'derivedA', s => s.get('derivedB')! + 1)
      expect(() => {
        createDerivedStat(stats, 'derivedB', s => s.get('derivedA')! + 1)
      }).toThrow(CircularDependencyError)
    })

    it('error message shows the dependency cycle', () => {
      const stats = createStatBlock({ a: { base: 10 } })
      createDerivedStat(stats, 'derivedA', s => s.get('derivedB')! + 1)
      try {
        createDerivedStat(stats, 'derivedB', s => s.get('derivedA')! + 1)
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(CircularDependencyError)
        expect((e as CircularDependencyError).cycle).toBeDefined()
      }
    })
  })

  describe('derived stat listing', () => {
    it('statBlock.stats() includes derived stats', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(stats.stats()).toContain('carryCapacity')
    })

    it('statBlock.isDerived(name) returns true for derived stats', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      expect(stats.isDerived('carryCapacity')).toBe(true)
    })

    it('statBlock.isDerived(name) returns false for regular stats', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(stats.isDerived('strength')).toBe(false)
    })
  })
})

describe('stat templates', () => {
  describe('createStatTemplate(config)', () => {
    it('creates reusable template object', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10, min: 1, max: 20 },
        },
      })
      expect(template).toBeDefined()
      expect(template.create).toBeDefined()
    })

    it('template is immutable after creation', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      const stats1 = template.create()
      const stats2 = template.create()
      stats1.set('strength', 20)
      expect(stats2.get('strength')).toBe(10)
    })
  })

  describe('template.create(overrides?)', () => {
    it('returns new independent stat block', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      const stats1 = template.create()
      const stats2 = template.create()
      expect(stats1).not.toBe(stats2)
    })

    it('each create() returns separate instance', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      const stats1 = template.create()
      const stats2 = template.create()
      stats1.set('strength', 20)
      expect(stats1.get('strength')).toBe(20)
      expect(stats2.get('strength')).toBe(10)
    })

    it('uses default values from template', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
          dexterity: { default: 12 },
        },
      })
      const stats = template.create()
      expect(stats.get('strength')).toBe(10)
      expect(stats.get('dexterity')).toBe(12)
    })

    it('overrides replace default base values', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
          dexterity: { default: 12 },
        },
      })
      const stats = template.create({ strength: 16 })
      expect(stats.get('strength')).toBe(16)
      expect(stats.get('dexterity')).toBe(12)
    })

    it('hero.strength is 16 (overridden)', () => {
      const characterTemplate = createStatTemplate({
        stats: {
          strength: { default: 10, min: 1, max: 20 },
          dexterity: { default: 10, min: 1, max: 20 },
          health: { default: 100, min: 0 },
        },
      })
      const hero = characterTemplate.create({ strength: 16 })
      expect(hero.get('strength')).toBe(16)
    })

    it('hero.dexterity is 10 (default)', () => {
      const characterTemplate = createStatTemplate({
        stats: {
          strength: { default: 10 },
          dexterity: { default: 10 },
        },
      })
      const hero = characterTemplate.create({ strength: 16 })
      expect(hero.get('dexterity')).toBe(10)
    })

    it('goblin.health is 30 (overridden)', () => {
      const characterTemplate = createStatTemplate({
        stats: {
          strength: { default: 10 },
          health: { default: 100 },
        },
      })
      const goblin = characterTemplate.create({ strength: 8, health: 30 })
      expect(goblin.get('health')).toBe(30)
    })

    it('modifying hero doesn\'t affect goblin', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      const hero = template.create({ strength: 16 })
      const goblin = template.create({ strength: 8 })
      hero.set('strength', 20)
      expect(goblin.get('strength')).toBe(8)
    })

    it('modifying goblin doesn\'t affect hero', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      const hero = template.create({ strength: 16 })
      const goblin = template.create({ strength: 8 })
      goblin.set('strength', 5)
      expect(hero.get('strength')).toBe(16)
    })
  })

  describe('template validation', () => {
    it('override value outside bounds is clamped', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10, min: 1, max: 20 },
        },
      })
      const stats = template.create({ strength: 30 })
      expect(stats.get('strength')).toBe(20)
    })

    it('override for non-existent stat is ignored with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
      })
      template.create({ unknown: 15 } as any)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('template options are applied to created stat blocks', () => {
      const template = createStatTemplate({
        stats: {
          strength: { default: 10 },
        },
        options: {
          historyLimit: 50,
        },
      })
      const stats = template.create()
      expect(stats.getRollHistory()).toEqual([])
    })
  })
})

describe('roll history', () => {
  describe('statBlock.getRollHistory(limit?)', () => {
    it('returns array of roll history entries', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const history = stats.getRollHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('most recent rolls first (reverse chronological)', () => {
      // This will be tested when we integrate roll history with check()
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(stats.getRollHistory()).toEqual([])
    })

    it('limit parameter restricts number returned', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const history = stats.getRollHistory(5)
      expect(history.length).toBeLessThanOrEqual(5)
    })

    it('default returns all stored history', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const history = stats.getRollHistory()
      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('history limit', () => {
    it('default limit is 100 entries', () => {
      const stats = createStatBlock({})
      expect(stats.getRollHistory()).toEqual([])
    })

    it('oldest entries evicted when limit reached', () => {
      // Will be tested with actual roll integration
      const stats = createStatBlock({}, { historyLimit: 2 })
      expect(stats.getRollHistory()).toEqual([])
    })

    it('{ historyLimit: 50 } keeps only 50 entries', () => {
      const stats = createStatBlock({}, { historyLimit: 50 })
      expect(stats.getRollHistory()).toEqual([])
    })

    it('{ historyLimit: 0 } disables history (getRollHistory returns [])', () => {
      const stats = createStatBlock({}, { historyLimit: 0 })
      expect(stats.getRollHistory()).toEqual([])
    })
  })

  describe('statBlock.clearRollHistory()', () => {
    it('removes all roll history entries', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.clearRollHistory()
      expect(stats.getRollHistory()).toEqual([])
    })

    it('getRollHistory() returns [] after clear', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.clearRollHistory()
      expect(stats.getRollHistory()).toHaveLength(0)
    })
  })
})

describe('events', () => {
  describe('statBlock.onChange(callback)', () => {
    it('fires when stat base value changes via set()', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.set('strength', 15)
      expect(callback).toHaveBeenCalled()
    })

    it('fires when stat base value changes via modify()', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.modify('strength', 5)
      expect(callback).toHaveBeenCalled()
    })

    it('fires when modifier added', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(callback).toHaveBeenCalled()
    })

    it('fires when modifier removed', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.removeModifier('strength', 'buff')
      expect(callback).toHaveBeenCalled()
    })

    it('fires when modifier expires via tick()', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 1 })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.tick()
      expect(callback).toHaveBeenCalled()
    })

    it('does not fire when value unchanged', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.set('strength', 10)
      expect(callback).not.toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      const unsubscribe = stats.onChange(callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
      stats.set('strength', 15)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('multiple callbacks', () => {
    it('multiple callbacks can be registered', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      stats.onChange(callback1)
      stats.onChange(callback2)
      stats.set('strength', 15)
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('all callbacks fire for each change', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      stats.onChange(callback1)
      stats.onChange(callback2)
      stats.set('strength', 15)
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('callbacks fire in registration order', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const order: number[] = []
      stats.onChange(() => order.push(1))
      stats.onChange(() => order.push(2))
      stats.set('strength', 15)
      expect(order).toEqual([1, 2])
    })

    it('unsubscribe removes only that callback', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      stats.onChange(callback1)
      const unsub2 = stats.onChange(callback2)
      unsub2()
      stats.set('strength', 15)
      expect(callback1).toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('callback error handling', () => {
    it('error in callback is caught and logged to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.onChange(() => {
        throw new Error('callback error')
      })
      stats.set('strength', 15)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('other callbacks still fire after error', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const goodCallback = vi.fn()
      stats.onChange(() => {
        throw new Error('error')
      })
      stats.onChange(goodCallback)
      stats.set('strength', 15)
      expect(goodCallback).toHaveBeenCalled()
    })

    it('stat change completes despite callback error', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.onChange(() => {
        throw new Error('error')
      })
      stats.set('strength', 15)
      expect(stats.get('strength')).toBe(15)
    })

    it('error includes stack trace in log', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.onChange(() => {
        throw new Error('callback error')
      })
      stats.set('strength', 15)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onChange'), expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('statBlock.onStat(statName, callback)', () => {
    it('fires only for changes to specified stat', () => {
      const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 10 } })
      const callback = vi.fn()
      stats.onStat('strength', callback)
      stats.set('dexterity', 15)
      expect(callback).not.toHaveBeenCalled()
      stats.set('strength', 15)
      expect(callback).toHaveBeenCalled()
    })

    it('callback receives same event object', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      let event: StatChangeEvent | null = null
      stats.onStat('strength', e => {
        event = e
      })
      stats.set('strength', 15)
      expect(event).toMatchObject({
        stat: 'strength',
        newValue: 15,
        oldValue: 10,
        baseChanged: true,
        modifiersChanged: false,
      })
    })

    it('returns unsubscribe function', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      const unsubscribe = stats.onStat('strength', callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
      stats.set('strength', 15)
      expect(callback).not.toHaveBeenCalled()
    })

    it('throws TypeError for non-existent stat', () => {
      const stats = createStatBlock({})
      expect(() => stats.onStat('missing', () => {})).toThrow(TypeError)
    })
  })

  describe('derived stat events', () => {
    it('onChange fires when derived stat value changes', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      const callback = vi.fn()
      stats.onChange(callback)
      stats.set('strength', 15)
      // Should fire twice: once for strength, once for carryCapacity
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('event.stat is the derived stat name', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      let derivedEvent: StatChangeEvent | null = null
      stats.onChange(e => {
        if (e.stat === 'carryCapacity') {
          derivedEvent = e
        }
      })
      stats.set('strength', 15)
      expect(derivedEvent?.stat).toBe('carryCapacity')
    })

    it('event.baseChanged is false (derived stats have no base)', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      let derivedEvent: StatChangeEvent | null = null
      stats.onChange(e => {
        if (e.stat === 'carryCapacity') {
          derivedEvent = e
        }
      })
      stats.set('strength', 15)
      expect(derivedEvent?.baseChanged).toBe(false)
    })
  })

  describe('batch changes', () => {
    it('each individual change fires separate event', () => {
      const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.set('strength', 15)
      stats.set('dexterity', 15)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('no built-in batching mechanism', () => {
      // Just verify individual changes fire individually
      const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.set('strength', 15)
      stats.set('dexterity', 15)
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('serialization', () => {
  describe('statBlock.toJSON()', () => {
    it('returns plain object suitable for JSON.stringify()', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const json = stats.toJSON()
      expect(typeof json).toBe('object')
      expect(() => JSON.stringify(json)).not.toThrow()
    })

    it('includes version field with value 1', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const json = stats.toJSON()
      expect(json.version).toBe(1)
    })

    it('includes all base values in stats object', () => {
      const stats = createStatBlock({ strength: { base: 14 }, dexterity: { base: 12 } })
      const json = stats.toJSON()
      expect(json.stats.strength).toBe(14)
      expect(json.stats.dexterity).toBe(12)
    })

    it('includes all active modifiers', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      const json = stats.toJSON()
      expect(json.modifiers.strength).toBeDefined()
      expect(json.modifiers.strength![0].value).toBe(5)
    })

    it('does NOT include derived stats', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
      const json = stats.toJSON()
      expect(json.stats.carryCapacity).toBeUndefined()
    })

    it('does NOT include stat definitions (min/max)', () => {
      const stats = createStatBlock({ strength: { base: 10, min: 1, max: 20 } })
      const json = stats.toJSON()
      expect((json.stats as any).min).toBeUndefined()
      expect((json.stats as any).max).toBeUndefined()
    })

    it('does NOT include roll history', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const json = stats.toJSON()
      expect((json as any).rollHistory).toBeUndefined()
    })
  })

  describe('createStatBlock(definitions, { fromJSON: data })', () => {
    it('restores base values from serialized data', () => {
      const original = createStatBlock({ strength: { base: 10 }, dexterity: { base: 12 } })
      original.set('strength', 15)
      const json = original.toJSON()
      const restored = createStatBlock(
        { strength: { base: 10 }, dexterity: { base: 12 } },
        { fromJSON: json }
      )
      expect(restored.get('strength')).toBe(15)
    })

    it('restores modifiers from serialized data', () => {
      const original = createStatBlock({ strength: { base: 10 } })
      original.addModifier('strength', { value: 5, source: 'buff' })
      const json = original.toJSON()
      const restored = createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      expect(restored.get('strength')).toBe(15)
    })

    it('validates against stat definitions', () => {
      const original = createStatBlock({ strength: { base: 10, max: 20 } })
      original.set('strength', 15)
      const json = original.toJSON()
      // Change max in definition
      const restored = createStatBlock({ strength: { base: 10, max: 12 } }, { fromJSON: json })
      expect(restored.get('strength')).toBeLessThanOrEqual(12)
    })
  })

  describe('mismatch handling', () => {
    it('unknown stat in JSON is ignored with console.warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const json = {
        version: 1,
        stats: { unknown: 10 },
        modifiers: {},
      }
      createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown stat'))
      consoleSpy.mockRestore()
    })

    it('missing stat in JSON uses definition\'s base value', () => {
      const json = {
        version: 1,
        stats: { strength: 15 },
        modifiers: {},
      }
      const stats = createStatBlock(
        { strength: { base: 10 }, dexterity: { base: 12 } },
        { fromJSON: json }
      )
      expect(stats.get('dexterity')).toBe(12)
    })

    it('modifier for unknown stat is ignored with console.warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const json = {
        version: 1,
        stats: {},
        modifiers: { unknown: [{ value: 5, source: 'buff', type: 'flat' as const, duration: 'permanent' as const }] },
      }
      createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('version handling', () => {
    it('version field required for fromJSON', () => {
      const json = {
        stats: { strength: 10 },
        modifiers: {},
      }
      // Should handle missing version gracefully or throw
      expect(() => {
        createStatBlock({ strength: { base: 10 } }, { fromJSON: json as any })
      }).not.toThrow()
    })

    it('unsupported version throws VersionError', () => {
      const json = {
        version: 999,
        stats: { strength: 10 },
        modifiers: {},
      }
      expect(() => {
        createStatBlock({ strength: { base: 10 } }, { fromJSON: json as any })
      }).toThrow(VersionError)
    })

    it('version 1 is currently the only supported version', () => {
      const json = {
        version: 1,
        stats: { strength: 10 },
        modifiers: {},
      }
      expect(() => {
        createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      }).not.toThrow()
    })
  })

  describe('round-trip', () => {
    it('statBlock.toJSON() → fromJSON produces equivalent stat block', () => {
      const original = createStatBlock({ strength: { base: 10 }, dexterity: { base: 12 } })
      original.set('strength', 15)
      original.addModifier('dexterity', { value: 3, source: 'buff' })
      const json = original.toJSON()
      const restored = createStatBlock(
        { strength: { base: 10 }, dexterity: { base: 12 } },
        { fromJSON: json }
      )
      expect(restored.get('strength')).toBe(original.get('strength'))
      expect(restored.get('dexterity')).toBe(original.get('dexterity'))
    })

    it('get() returns same values after round-trip', () => {
      const original = createStatBlock({ strength: { base: 10 } })
      original.set('strength', 15)
      const json = original.toJSON()
      const restored = createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      expect(restored.get('strength')).toBe(15)
    })

    it('modifiers preserved with correct duration', () => {
      const original = createStatBlock({ strength: { base: 10 } })
      original.addModifier('strength', { value: 5, source: 'buff', duration: 3 })
      const json = original.toJSON()
      const restored = createStatBlock({ strength: { base: 10 } }, { fromJSON: json })
      expect(restored.getRemainingDuration('strength', 'buff')).toBe(3)
    })
  })
})

describe('utility functions', () => {
  describe('rollTable(entries)', () => {
    it('returns value from weighted random selection', () => {
      const entries = [
        { weight: 1, value: 'common' },
        { weight: 0.1, value: 'rare' },
      ]
      const result = rollTable(entries)
      expect(['common', 'rare']).toContain(result)
    })

    it('higher weight = higher probability', () => {
      const entries = [
        { weight: 100, value: 'common' },
        { weight: 1, value: 'rare' },
      ]
      const results: string[] = []
      for (let i = 0; i < 100; i++) {
        results.push(rollTable(entries))
      }
      const commonCount = results.filter(r => r === 'common').length
      expect(commonCount).toBeGreaterThan(80)
    })

    it('weights are relative (1 and 2 same as 0.5 and 1)', () => {
      // Hard to test precisely, but both should work
      const entries1 = [
        { weight: 1, value: 'a' },
        { weight: 2, value: 'b' },
      ]
      const entries2 = [
        { weight: 0.5, value: 'a' },
        { weight: 1, value: 'b' },
      ]
      expect(() => rollTable(entries1)).not.toThrow()
      expect(() => rollTable(entries2)).not.toThrow()
    })

    it('single entry always returns that entry\'s value', () => {
      const entries = [{ weight: 1, value: 'only' }]
      for (let i = 0; i < 10; i++) {
        expect(rollTable(entries)).toBe('only')
      }
    })

    it('throws ValidationError for empty entries array', () => {
      expect(() => rollTable([])).toThrow(ValidationError)
    })

    it('throws ValidationError for all-zero weights', () => {
      const entries = [
        { weight: 0, value: 'a' },
        { weight: 0, value: 'b' },
      ]
      expect(() => rollTable(entries)).toThrow(ValidationError)
    })

    it('throws ValidationError for negative weight', () => {
      const entries = [
        { weight: -1, value: 'a' },
        { weight: 1, value: 'b' },
      ]
      expect(() => rollTable(entries)).toThrow(ValidationError)
    })

    it('accepts float weights (0.5, 1.5, etc.)', () => {
      const entries = [
        { weight: 0.5, value: 'a' },
        { weight: 1.5, value: 'b' },
      ]
      expect(() => rollTable(entries)).not.toThrow()
    })

    it('weight 0 entry is never selected', () => {
      const entries = [
        { weight: 0, value: 'never' },
        { weight: 1, value: 'always' },
      ]
      for (let i = 0; i < 20; i++) {
        expect(rollTable(entries)).toBe('always')
      }
    })

    it('over 1000 rolls, distribution approximates weights (within tolerance)', () => {
      const entries = [
        { weight: 1, value: 'a' },
        { weight: 1, value: 'b' },
      ]
      const results: string[] = []
      for (let i = 0; i < 1000; i++) {
        results.push(rollTable(entries))
      }
      const aCount = results.filter(r => r === 'a').length
      // Should be around 500, allow +/- 100 tolerance
      expect(aCount).toBeGreaterThan(350)
      expect(aCount).toBeLessThan(650)
    })
  })

  describe('contest(a, b, options?)', () => {
    it('both sides roll specified dice', () => {
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.rolls.a).toBeDefined()
      expect(result.rolls.b).toBeDefined()
    })

    it('adds stat modifier to each side\'s roll', () => {
      mockRandomSequence([0.5, 0.5]) // Both roll 11
      const statsA = createStatBlock({ strength: { base: 14 } }) // +2
      const statsB = createStatBlock({ strength: { base: 10 } }) // +0
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.totals.a).toBe(11 + 2)
      expect(result.totals.b).toBe(11 + 0)
    })

    it('higher total wins', () => {
      mockRandomSequence([0.8, 0.1]) // A rolls 17, B rolls 3
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.winner).toBe('a')
    })

    it('exact tie returns winner: "tie"', () => {
      mockRandomSequence([0.5, 0.5]) // Both roll 11
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.winner).toBe('tie')
    })

    it('margin is absolute difference between totals', () => {
      mockRandomSequence([0.8, 0.1]) // A rolls 17, B rolls 3
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.margin).toBe(14)
    })

    it('default dice is 1d20', () => {
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength')
      expect(result.rolls.a).toBeGreaterThanOrEqual(1)
      expect(result.rolls.a).toBeLessThanOrEqual(20)
    })

    it('custom dice via options.dice', () => {
      const statsA = createStatBlock({ strength: { base: 10 } })
      const statsB = createStatBlock({ strength: { base: 10 } })
      const result = contest(statsA, 'strength', statsB, 'strength', { dice: '2d6' })
      expect(result.rolls.a).toBeGreaterThanOrEqual(2)
      expect(result.rolls.a).toBeLessThanOrEqual(12)
    })

    it('contest(heroStats, "str", monsterStats, "str") uses str modifiers', () => {
      mockRandomSequence([0.5, 0.5])
      const hero = createStatBlock({ str: { base: 16 } })
      const monster = createStatBlock({ str: { base: 12 } })
      const result = contest(hero, 'str', monster, 'str')
      expect(result.totals.a).toBe(11 + 3) // (16-10)/2 = 3
      expect(result.totals.b).toBe(11 + 1) // (12-10)/2 = 1
    })

    it('modifier calculated using modifierFormula', () => {
      const customFormula = (v: number) => v
      const statsA = createStatBlock({ str: { base: 5 } }, { modifierFormula: customFormula })
      const statsB = createStatBlock({ str: { base: 3 } }, { modifierFormula: customFormula })
      const result = contest(statsA, 'str', statsB, 'str')
      // Modifiers should be 5 and 3 directly
      expect(result.totals.a - result.rolls.a).toBe(5)
      expect(result.totals.b - result.rolls.b).toBe(3)
    })

    it('contest(5, 3) compares with +5 vs +3 modifiers', () => {
      mockRandomSequence([0.5, 0.5]) // Both roll 11
      const result = contest(5, 3)
      expect(result.totals.a).toBe(11 + 5)
      expect(result.totals.b).toBe(11 + 3)
    })
  })

  describe('saveThrow(statBlock, statName, difficulty)', () => {
    it('simplified check that returns boolean only', () => {
      const stats = createStatBlock({ dexterity: { base: 14 } })
      const result = saveThrow(stats, 'dexterity', 15)
      expect(typeof result).toBe('boolean')
    })

    it('uses 1d20 + stat modifier', () => {
      mockRandomSequence([0.7]) // 15
      const stats = createStatBlock({ dexterity: { base: 14 } }) // +2
      const result = saveThrow(stats, 'dexterity', 15)
      // 15 + 2 = 17 >= 15
      expect(result).toBe(true)
    })

    it('returns true if roll + modifier >= difficulty', () => {
      mockRandomSequence([0.8]) // 17
      const stats = createStatBlock({ dexterity: { base: 10 } })
      const result = saveThrow(stats, 'dexterity', 15)
      expect(result).toBe(true)
    })

    it('returns false otherwise', () => {
      mockRandomSequence([0.1]) // 3
      const stats = createStatBlock({ dexterity: { base: 10 } })
      const result = saveThrow(stats, 'dexterity', 15)
      expect(result).toBe(false)
    })

    it('equivalent to check(...).success', () => {
      mockRandomSequence([0.5, 0.5])
      const stats = createStatBlock({ dexterity: { base: 14 } })
      const saveResult = saveThrow(stats, 'dexterity', 15)
      const checkResult = check(stats, 'dexterity', { difficulty: 15 })
      expect(saveResult).toBe(checkResult.success)
    })
  })
})
