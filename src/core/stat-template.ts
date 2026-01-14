import { createStatBlock } from './stat-block'
import type { StatTemplate, StatTemplateConfig, StatBlock } from '../types'

/**
 * Creates a reusable stat block template.
 *
 * Templates define default stat values and allow creating multiple independent
 * stat blocks with the same structure but different initial values.
 *
 * @param config - Template configuration with default values
 * @returns A template that can create stat blocks
 *
 * @example
 * ```typescript
 * const characterTemplate = createStatTemplate({
 *   stats: {
 *     strength: { default: 10, min: 1, max: 20 },
 *     health: { default: 100, min: 0 }
 *   }
 * })
 *
 * const hero = characterTemplate.create({ strength: 16 })
 * const goblin = characterTemplate.create({ strength: 8, health: 30 })
 * ```
 */
export function createStatTemplate(config: StatTemplateConfig): StatTemplate {
  const { stats: statDefs, options } = config

  function create(overrides?: Record<string, number>): StatBlock {
    // Build definitions from template
    const definitions: Record<string, { base: number; min?: number; max?: number }> = {}

    // Forbidden keys to prevent prototype pollution
    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

    for (const [name, def] of Object.entries(statDefs)) {
      let base = def.default

      // Apply override if provided
      if (overrides && name in overrides) {
        // Skip forbidden keys to prevent prototype pollution
        if (!FORBIDDEN_KEYS.has(name) && Object.hasOwn(overrides, name)) {
          base = overrides[name]!
        }
      }

      const statDef: { base: number; min?: number; max?: number } = { base }
      if (def.min !== undefined) {
        statDef.min = def.min
      }
      if (def.max !== undefined) {
        statDef.max = def.max
      }

      definitions[name] = statDef
    }

    // Warn about unknown overrides
    if (overrides) {
      for (const name of Object.keys(overrides)) {
        // Skip forbidden keys
        if (FORBIDDEN_KEYS.has(name)) {
          continue
        }
        if (!Object.hasOwn(overrides, name)) {
          continue
        }
        if (!(name in statDefs)) {
          console.warn(`Override for unknown stat: ${name}`)
        }
      }
    }

    return createStatBlock(definitions, options)
  }

  return {
    create,
  }
}
