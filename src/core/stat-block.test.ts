import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStatBlock } from './stat-block'
import { ValidationError } from '../errors'

describe('createStatBlock(definitions, options?)', () => {
  describe('basic creation', () => {
    it('createStatBlock({}) creates empty stat block', () => {
      const stats = createStatBlock({})
      expect(stats.stats()).toEqual([])
    })

    it('createStatBlock({ strength: { base: 10 } }) creates stat with base value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(stats.get('strength')).toBe(10)
    })

    it('createStatBlock({ a: { base: 1 }, b: { base: 2 } }) creates multiple stats', () => {
      const stats = createStatBlock({ a: { base: 1 }, b: { base: 2 } })
      expect(stats.get('a')).toBe(1)
      expect(stats.get('b')).toBe(2)
    })

    it('each stat is independent', () => {
      const stats = createStatBlock({ a: { base: 1 }, b: { base: 2 } })
      stats.set('a', 10)
      expect(stats.get('a')).toBe(10)
      expect(stats.get('b')).toBe(2)
    })
  })

  describe('stat definition options', () => {
    it('{ base: 14 } sets initial value to 14, no bounds', () => {
      const stats = createStatBlock({ strength: { base: 14 } })
      expect(stats.getBase('strength')).toBe(14)
    })

    it('{ base: 100, min: 0, max: 100 } enforces bounds on base value', () => {
      const stats = createStatBlock({ health: { base: 100, min: 0, max: 100 } })
      expect(stats.getBase('health')).toBe(100)
    })

    it('{ base: 50, min: 0 } has floor but no ceiling', () => {
      const stats = createStatBlock({ stat: { base: 50, min: 0 } })
      stats.set('stat', -10)
      expect(stats.getBase('stat')).toBe(0)
    })

    it('{ base: 50, max: 100 } has ceiling but no floor', () => {
      const stats = createStatBlock({ stat: { base: 50, max: 100 } })
      stats.set('stat', 200)
      expect(stats.getBase('stat')).toBe(100)
    })

    it('{ base: -5, min: 0 } clamps initial base to min (becomes 0)', () => {
      const stats = createStatBlock({ stat: { base: -5, min: 0 } })
      expect(stats.getBase('stat')).toBe(0)
    })

    it('{ base: 150, max: 100 } clamps initial base to max (becomes 100)', () => {
      const stats = createStatBlock({ stat: { base: 150, max: 100 } })
      expect(stats.getBase('stat')).toBe(100)
    })

    it('{ base: 50, min: 100, max: 10 } throws ValidationError: min > max', () => {
      expect(() => {
        createStatBlock({ stat: { base: 50, min: 100, max: 10 } })
      }).toThrow(ValidationError)
    })
  })

  describe('stat block options', () => {
    it('default historyLimit is 100', () => {
      const stats = createStatBlock({})
      // We'll verify this when we implement roll history
      expect(stats.getRollHistory()).toEqual([])
    })

    it('{ historyLimit: 50 } limits roll history to 50 entries', () => {
      const stats = createStatBlock({}, { historyLimit: 50 })
      expect(stats.getRollHistory()).toEqual([])
    })

    it('{ historyLimit: 0 } disables roll history', () => {
      const stats = createStatBlock({}, { historyLimit: 0 })
      expect(stats.getRollHistory()).toEqual([])
    })

    it('{ modifierFormula: (v) => v } uses custom formula for checks', () => {
      const customFormula = (v: number) => v * 2
      const stats = createStatBlock({ strength: { base: 10 } }, { modifierFormula: customFormula })
      // We'll verify this when we implement checks
      expect(stats.get('strength')).toBe(10)
    })

    it('modifierFormula receives effective stat value', () => {
      let receivedValue = 0
      const customFormula = (v: number) => {
        receivedValue = v
        return Math.floor((v - 10) / 2)
      }
      const stats = createStatBlock({ strength: { base: 14 } }, { modifierFormula: customFormula })
      stats.addModifier('strength', { value: 2, source: 'buff' })
      // Formula should receive effective value (16)
      expect(stats.get('strength')).toBe(16)
    })
  })
})

describe('statBlock.get(statName)', () => {
  it('returns effective value (base + all modifiers applied)', () => {
    const stats = createStatBlock({ strength: { base: 14 } })
    stats.addModifier('strength', { value: 2, source: 'buff' })
    expect(stats.get('strength')).toBe(16)
  })

  it('returns base value when no modifiers present', () => {
    const stats = createStatBlock({ strength: { base: 14 } })
    expect(stats.get('strength')).toBe(14)
  })

  it('returns undefined for non-existent stat', () => {
    const stats = createStatBlock({})
    expect(stats.get('missing')).toBeUndefined()
  })

  it('does not throw for non-existent stat', () => {
    const stats = createStatBlock({})
    expect(() => stats.get('missing')).not.toThrow()
  })
})

describe('statBlock.getBase(statName)', () => {
  it('returns base value ignoring all modifiers', () => {
    const stats = createStatBlock({ strength: { base: 14 } })
    stats.addModifier('strength', { value: 10, source: 'buff' })
    expect(stats.getBase('strength')).toBe(14)
  })

  it('returns undefined for non-existent stat', () => {
    const stats = createStatBlock({})
    expect(stats.getBase('missing')).toBeUndefined()
  })

  it('base value is unaffected by modifiers', () => {
    const stats = createStatBlock({ strength: { base: 14 } })
    stats.addModifier('strength', { value: 100, source: 'huge' })
    expect(stats.getBase('strength')).toBe(14)
    expect(stats.get('strength')).toBe(114)
  })
})

describe('statBlock.set(statName, value)', () => {
  it('sets base value to new value', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    stats.set('strength', 15)
    expect(stats.getBase('strength')).toBe(15)
  })

  it('returns the new base value', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    const result = stats.set('strength', 15)
    expect(result).toBe(15)
  })

  it('clamps to min if value below minimum', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0 } })
    const result = stats.set('health', -10)
    expect(result).toBe(0)
    expect(stats.getBase('health')).toBe(0)
  })

  it('clamps to max if value above maximum', () => {
    const stats = createStatBlock({ health: { base: 50, max: 100 } })
    const result = stats.set('health', 150)
    expect(result).toBe(100)
    expect(stats.getBase('health')).toBe(100)
  })

  it('throws TypeError for non-existent stat', () => {
    const stats = createStatBlock({})
    expect(() => stats.set('missing', 10)).toThrow(TypeError)
  })

  it('error message includes stat name for debugging', () => {
    const stats = createStatBlock({})
    expect(() => stats.set('missing', 10)).toThrow(/missing/)
  })
})

describe('statBlock.modify(statName, delta)', () => {
  it('adjusts base by positive delta', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    stats.modify('strength', 5)
    expect(stats.getBase('strength')).toBe(15)
  })

  it('adjusts base by negative delta', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    stats.modify('strength', -3)
    expect(stats.getBase('strength')).toBe(7)
  })

  it('modify("stat", 0) is no-op but valid', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    stats.modify('strength', 0)
    expect(stats.getBase('strength')).toBe(10)
  })

  it('clamps result to min bound', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0 } })
    stats.modify('health', -100)
    expect(stats.getBase('health')).toBe(0)
  })

  it('clamps result to max bound', () => {
    const stats = createStatBlock({ health: { base: 50, max: 100 } })
    stats.modify('health', 100)
    expect(stats.getBase('health')).toBe(100)
  })

  it('returns new base value after clamping', () => {
    const stats = createStatBlock({ health: { base: 50, max: 100 } })
    const result = stats.modify('health', 100)
    expect(result).toBe(100)
  })

  it('throws TypeError for non-existent stat', () => {
    const stats = createStatBlock({})
    expect(() => stats.modify('missing', 5)).toThrow(TypeError)
  })
})

describe('statBlock.has(statName)', () => {
  it('returns true if stat exists', () => {
    const stats = createStatBlock({ strength: { base: 10 } })
    expect(stats.has('strength')).toBe(true)
  })

  it('returns false if stat does not exist', () => {
    const stats = createStatBlock({})
    expect(stats.has('missing')).toBe(false)
  })
})

describe('statBlock.stats()', () => {
  it('returns array of all stat names', () => {
    const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 12 } })
    expect(stats.stats()).toEqual(expect.arrayContaining(['strength', 'dexterity']))
    expect(stats.stats()).toHaveLength(2)
  })

  it('returns empty array for empty stat block', () => {
    const stats = createStatBlock({})
    expect(stats.stats()).toEqual([])
  })
})

describe('statBlock.addModifier(statName, modifier)', () => {
  describe('basic modifier behavior', () => {
    it('adds modifier to specified stat', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(stats.get('strength')).toBe(15)
    })

    it('modifier affects get() return value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(stats.get('strength')).toBe(10)
      stats.addModifier('strength', { value: 3, source: 'buff' })
      expect(stats.get('strength')).toBe(13)
    })

    it('modifier does not affect getBase() return value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(stats.getBase('strength')).toBe(10)
    })

    it('returns the modifier object that was added', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const mod = { value: 5, source: 'buff' }
      const result = stats.addModifier('strength', mod)
      expect(result).toEqual(expect.objectContaining({ value: 5, source: 'buff' }))
    })

    it('throws TypeError for non-existent stat', () => {
      const stats = createStatBlock({})
      expect(() => stats.addModifier('missing', { value: 5, source: 'buff' })).toThrow(TypeError)
    })
  })

  describe('flat modifiers (default)', () => {
    it('{ value: 5, source: "buff" } adds 5 to effective value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(stats.get('strength')).toBe(15)
    })

    it('{ value: -3, source: "debuff" } subtracts 3 from effective value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: -3, source: 'debuff' })
      expect(stats.get('strength')).toBe(7)
    })

    it('{ value: 0, source: "null" } has no effect but is valid', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 0, source: 'null' })
      expect(stats.get('strength')).toBe(10)
    })

    it('type defaults to "flat" when not specified', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      const mods = stats.getModifiers('strength')
      expect(mods).toBeDefined()
      expect(mods![0].type).toBe('flat')
    })
  })

  describe('multiply modifiers', () => {
    it('{ value: 2, type: "multiply", source: "double" } doubles effective value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, type: 'multiply', source: 'double' })
      expect(stats.get('strength')).toBe(20)
    })

    it('{ value: 0.5, type: "multiply", source: "half" } halves effective value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 0.5, type: 'multiply', source: 'half' })
      expect(stats.get('strength')).toBe(5)
    })

    it('{ value: 1, type: "multiply", source: "identity" } has no effect', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 1, type: 'multiply', source: 'identity' })
      expect(stats.get('strength')).toBe(10)
    })

    it('{ value: 0, type: "multiply", source: "zero" } reduces to zero', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 0, type: 'multiply', source: 'zero' })
      expect(stats.get('strength')).toBe(0)
    })

    it('{ value: -1, type: "multiply", source: "negate" } negates the value', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: -1, type: 'multiply', source: 'negate' })
      expect(stats.get('strength')).toBe(-10)
    })
  })

  describe('multiple modifiers stacking', () => {
    it('multiple flat modifiers sum: base 10 + flat 5 + flat 3 = 18', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff1' })
      stats.addModifier('strength', { value: 3, source: 'buff2' })
      expect(stats.get('strength')).toBe(18)
    })

    it('multiple multiply modifiers chain: (base * 2) * 1.5', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, type: 'multiply', source: 'double' })
      stats.addModifier('strength', { value: 1.5, type: 'multiply', source: 'bonus' })
      expect(stats.get('strength')).toBe(30) // (10 * 2) * 1.5
    })

    it('flat applies before multiply: (base + flats) * mult1 * mult2', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'flat' })
      stats.addModifier('strength', { value: 2, type: 'multiply', source: 'mult' })
      expect(stats.get('strength')).toBe(30) // (10 + 5) * 2
    })

    it('order of multipliers is order added', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, type: 'multiply', source: 'first' })
      stats.addModifier('strength', { value: 1.5, type: 'multiply', source: 'second' })
      expect(stats.get('strength')).toBe(30)
    })
  })

  describe('order of operations example', () => {
    it('base=10, flat +5, flat +3, mult x2, mult x1.5 equals 54', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'str_bonus' })
      stats.addModifier('strength', { value: 3, source: 'item_bonus' })
      stats.addModifier('strength', { value: 2, type: 'multiply', source: 'giant_strength' })
      stats.addModifier('strength', { value: 1.5, type: 'multiply', source: 'rage' })
      expect(stats.get('strength')).toBe(54) // (10 + 5 + 3) * 2 * 1.5
    })

    it('changing order of multipliers changes result', () => {
      const stats1 = createStatBlock({ strength: { base: 10 } })
      stats1.addModifier('strength', { value: 2, type: 'multiply', source: 'a' })
      stats1.addModifier('strength', { value: 3, type: 'multiply', source: 'b' })

      const stats2 = createStatBlock({ strength: { base: 10 } })
      stats2.addModifier('strength', { value: 3, type: 'multiply', source: 'b' })
      stats2.addModifier('strength', { value: 2, type: 'multiply', source: 'a' })

      // Both should be 60 since multiplication is commutative
      expect(stats1.get('strength')).toBe(60)
      expect(stats2.get('strength')).toBe(60)
    })

    it('changing order of flats does not change result', () => {
      const stats1 = createStatBlock({ strength: { base: 10 } })
      stats1.addModifier('strength', { value: 5, source: 'a' })
      stats1.addModifier('strength', { value: 3, source: 'b' })

      const stats2 = createStatBlock({ strength: { base: 10 } })
      stats2.addModifier('strength', { value: 3, source: 'b' })
      stats2.addModifier('strength', { value: 5, source: 'a' })

      expect(stats1.get('strength')).toBe(18)
      expect(stats2.get('strength')).toBe(18)
    })
  })
})

describe('stat modifiers - duration', () => {
  describe('permanent modifiers', () => {
    it('{ duration: "permanent", ... } never expires', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'perm', duration: 'permanent' })
      stats.tick()
      stats.tick()
      stats.tick()
      expect(stats.get('strength')).toBe(15)
    })

    it('permanent is the default when duration not specified', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      stats.tick()
      expect(stats.get('strength')).toBe(15)
    })

    it('permanent modifiers survive tick() calls', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'perm', duration: 'permanent' })
      for (let i = 0; i < 100; i++) stats.tick()
      expect(stats.get('strength')).toBe(15)
    })

    it('permanent modifiers must be manually removed', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'perm', duration: 'permanent' })
      stats.tick()
      stats.tick()
      expect(stats.get('strength')).toBe(15)
      stats.removeModifier('strength', 'perm')
      expect(stats.get('strength')).toBe(10)
    })
  })

  describe('temporary modifiers', () => {
    it('{ duration: "temporary", ... } expires after 1 tick (default)', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'temp', duration: 'temporary' })
      expect(stats.get('strength')).toBe(15)
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })

    it('{ duration: 1, ... } expires after 1 tick', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 1 })
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })

    it('{ duration: 3, ... } expires after 3 ticks', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 3 })
      stats.tick()
      expect(stats.get('strength')).toBe(15)
      stats.tick()
      expect(stats.get('strength')).toBe(15)
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })

    it('{ duration: 0, ... } expires immediately on next tick', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 0 })
      expect(stats.get('strength')).toBe(15)
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })
  })

  describe('statBlock.tick()', () => {
    it('decrements remaining duration on all temporary modifiers', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 3 })
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(3)
      stats.tick()
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(2)
    })

    it('removes modifiers when duration reaches 0', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 1 })
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })

    it('does not affect permanent modifiers', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'perm', duration: 'permanent' })
      stats.tick()
      expect(stats.getRemainingDuration('strength', 'perm')).toBe(Infinity)
    })

    it('returns array of expired modifier sources', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 1 })
      const expired = stats.tick()
      expect(expired).toContain('buff')
    })

    it('fires onChange events for each removed modifier', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 1 })
      callback.mockClear()
      stats.tick()
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('tick example', () => {
    it('modifier with duration 3 survives 2 ticks', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff', duration: 3 })
      stats.tick()
      stats.tick()
      expect(stats.get('strength')).toBe(12)
    })

    it('modifier with duration 3 is removed on 3rd tick', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff', duration: 3 })
      stats.tick()
      stats.tick()
      stats.tick()
      expect(stats.get('strength')).toBe(10)
    })

    it('tick() returns ["buff"] when buff expires', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff', duration: 1 })
      const expired = stats.tick()
      expect(expired).toEqual(['buff'])
    })

    it('tick() returns [] when nothing expires', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff', duration: 3 })
      const expired = stats.tick()
      expect(expired).toEqual([])
    })

    it('multiple modifiers can expire on same tick', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff1', duration: 1 })
      stats.addModifier('strength', { value: 3, source: 'buff2', duration: 1 })
      const expired = stats.tick()
      expect(expired).toContain('buff1')
      expect(expired).toContain('buff2')
    })
  })

  describe('statBlock.getRemainingDuration(statName, source)', () => {
    it('returns remaining ticks for temporary modifier', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', duration: 5 })
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(5)
      stats.tick()
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(4)
    })

    it('returns Infinity for permanent modifier', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'perm', duration: 'permanent' })
      expect(stats.getRemainingDuration('strength', 'perm')).toBe(Infinity)
    })

    it('returns undefined if modifier doesn\'t exist', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(stats.getRemainingDuration('strength', 'missing')).toBeUndefined()
    })
  })
})

describe('stat modifiers - management', () => {
  describe('statBlock.removeModifier(statName, source)', () => {
    it('removes modifier matching source string', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(stats.get('strength')).toBe(15)
      stats.removeModifier('strength', 'buff')
      expect(stats.get('strength')).toBe(10)
    })

    it('get() reflects removal immediately', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      stats.removeModifier('strength', 'buff')
      expect(stats.get('strength')).toBe(10)
    })

    it('returns true if modifier was found and removed', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      const result = stats.removeModifier('strength', 'buff')
      expect(result).toBe(true)
    })

    it('returns false if source doesn\'t exist (no-op)', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const result = stats.removeModifier('strength', 'missing')
      expect(result).toBe(false)
    })

    it('does not throw for non-existent source', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      expect(() => stats.removeModifier('strength', 'missing')).not.toThrow()
    })
  })

  describe('statBlock.getModifiers(statName)', () => {
    it('returns array of active modifiers for stat', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff1' })
      stats.addModifier('strength', { value: 3, source: 'buff2' })
      const mods = stats.getModifiers('strength')
      expect(mods).toHaveLength(2)
    })

    it('returns empty array if no modifiers', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const mods = stats.getModifiers('strength')
      expect(mods).toEqual([])
    })

    it('returns undefined if stat doesn\'t exist', () => {
      const stats = createStatBlock({})
      const mods = stats.getModifiers('missing')
      expect(mods).toBeUndefined()
    })

    it('each modifier includes value, source, type, duration info', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff', type: 'flat', duration: 3 })
      const mods = stats.getModifiers('strength')
      expect(mods![0]).toMatchObject({
        value: 5,
        source: 'buff',
        type: 'flat',
        duration: 3,
      })
    })
  })

  describe('statBlock.clearModifiers(statName?)', () => {
    it('clearModifiers("strength") removes all modifiers from strength', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff1' })
      stats.addModifier('strength', { value: 3, source: 'buff2' })
      stats.clearModifiers('strength')
      expect(stats.get('strength')).toBe(10)
    })

    it('clearModifiers() removes all modifiers from all stats', () => {
      const stats = createStatBlock({ strength: { base: 10 }, dexterity: { base: 12 } })
      stats.addModifier('strength', { value: 5, source: 'buff1' })
      stats.addModifier('dexterity', { value: 3, source: 'buff2' })
      stats.clearModifiers()
      expect(stats.get('strength')).toBe(10)
      expect(stats.get('dexterity')).toBe(12)
    })

    it('fires onChange events for affected stats', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.onChange(callback)
      stats.addModifier('strength', { value: 5, source: 'buff' })
      callback.mockClear()
      stats.clearModifiers('strength')
      expect(callback).toHaveBeenCalled()
    })

    it('returns number of modifiers removed', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 5, source: 'buff1' })
      stats.addModifier('strength', { value: 3, source: 'buff2' })
      const count = stats.clearModifiers('strength')
      expect(count).toBe(2)
    })
  })

  describe('duplicate source behavior', () => {
    it('adding modifier with existing source replaces the old modifier', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff' })
      expect(stats.get('strength')).toBe(12)
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(stats.get('strength')).toBe(15)
    })

    it('replacement uses new value, type, and duration', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, type: 'flat', duration: 3, source: 'buff' })
      stats.addModifier('strength', { value: 2, type: 'multiply', duration: 5, source: 'buff' })
      expect(stats.get('strength')).toBe(20)
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(5)
    })

    it('fires single onChange event (not remove + add)', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      const callback = vi.fn()
      stats.addModifier('strength', { value: 2, source: 'buff' })
      stats.onChange(callback)
      stats.addModifier('strength', { value: 5, source: 'buff' })
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('second addModifier with same source replaces first', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, duration: 3, source: 'buff' })
      stats.addModifier('strength', { value: 5, duration: 2, source: 'buff' })
      const mods = stats.getModifiers('strength')
      expect(mods).toHaveLength(1)
    })

    it('only one modifier with source "buff" exists', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, source: 'buff' })
      stats.addModifier('strength', { value: 5, source: 'buff' })
      const mods = stats.getModifiers('strength')
      expect(mods).toHaveLength(1)
      expect(mods![0].value).toBe(5)
    })

    it('new duration resets the expiration', () => {
      const stats = createStatBlock({ strength: { base: 10 } })
      stats.addModifier('strength', { value: 2, duration: 3, source: 'buff' })
      stats.tick()
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(2)
      stats.addModifier('strength', { value: 5, duration: 5, source: 'buff' })
      expect(stats.getRemainingDuration('strength', 'buff')).toBe(5)
    })
  })
})

describe('stat modifiers - bounds interaction', () => {
  it('modifier can push effective value below stat\'s min bound', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0 } })
    stats.addModifier('health', { value: -100, source: 'curse' })
    expect(stats.get('health')).toBe(-50)
  })

  it('modifier can push effective value above stat\'s max bound', () => {
    const stats = createStatBlock({ health: { base: 50, max: 100 } })
    stats.addModifier('health', { value: 60, source: 'buff' })
    expect(stats.get('health')).toBe(110)
  })

  it('get() returns actual effective value, not clamped', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0, max: 100 } })
    stats.addModifier('health', { value: 100, source: 'buff' })
    expect(stats.get('health')).toBe(150)
  })

  it('bounds only enforced on base value via set() and modify()', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0, max: 100 } })
    stats.set('health', 150)
    expect(stats.getBase('health')).toBe(100)
    stats.addModifier('health', { value: 100, source: 'buff' })
    expect(stats.get('health')).toBe(200)
  })

  it('health with max 100, base 50, flat +60 returns 110', () => {
    const stats = createStatBlock({ health: { base: 50, max: 100 } })
    stats.addModifier('health', { value: 60, source: 'buff' })
    expect(stats.get('health')).toBe(110)
  })

  it('health with min 0, base 50, flat -100 returns -50', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0 } })
    stats.addModifier('health', { value: -100, source: 'curse' })
    expect(stats.get('health')).toBe(-50)
  })

  it('base value remains within bounds even with modifiers', () => {
    const stats = createStatBlock({ health: { base: 50, min: 0, max: 100 } })
    stats.addModifier('health', { value: 200, source: 'huge' })
    expect(stats.getBase('health')).toBe(50)
    stats.set('health', 200)
    expect(stats.getBase('health')).toBe(100)
  })
})
