import { describe, it, expect } from 'vitest'
import { createStatTemplate } from './stat-template'

describe('Security: prototype pollution prevention in stat-template', () => {
  it('rejects __proto__ in overrides', () => {
    const template = createStatTemplate({
      stats: {
        strength: { default: 10, min: 1, max: 20 },
      },
    })

    const malicious = { __proto__: 999 } as any
    const stats = template.create(malicious)

    // Should not pollute Object.prototype
    expect((({} as any).polluted)).toBeUndefined()
    expect(stats.get('__proto__')).toBeUndefined()
  })

  it('rejects constructor in overrides', () => {
    const template = createStatTemplate({
      stats: {
        strength: { default: 10, min: 1, max: 20 },
      },
    })

    const malicious = { constructor: 999 } as any
    const stats = template.create(malicious)

    expect(stats.get('constructor')).toBeUndefined()
  })

  it('rejects prototype in overrides', () => {
    const template = createStatTemplate({
      stats: {
        strength: { default: 10, min: 1, max: 20 },
      },
    })

    const malicious = { prototype: 999 } as any
    const stats = template.create(malicious)

    expect(stats.get('prototype')).toBeUndefined()
  })

  it('only processes own properties in overrides', () => {
    const template = createStatTemplate({
      stats: {
        strength: { default: 10, min: 1, max: 20 },
        dexterity: { default: 10, min: 1, max: 20 },
      },
    })

    const maliciousProto = { inherited: 999 }
    const malicious = Object.create(maliciousProto)
    malicious.strength = 16

    const stats = template.create(malicious)

    expect(stats.get('strength')).toBe(16)
    expect(stats.get('inherited')).toBeUndefined()
    expect(stats.get('dexterity')).toBe(10) // Uses default
  })

  it('handles legitimate overrides normally', () => {
    const template = createStatTemplate({
      stats: {
        strength: { default: 10, min: 1, max: 20 },
        dexterity: { default: 10, min: 1, max: 20 },
      },
    })

    const stats = template.create({ strength: 16, dexterity: 14 })

    expect(stats.get('strength')).toBe(16)
    expect(stats.get('dexterity')).toBe(14)
  })
})
