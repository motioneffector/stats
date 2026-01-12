import { roll } from './dice'
import { ValidationError, CircularDependencyError } from '../errors'
import type {
  StatBlock,
  CheckOptions,
  CheckResult,
  ContestOptions,
  ContestResult,
  RollTableEntry,
} from '../types'

/**
 * Performs a stat check by rolling dice and adding the stat's modifier.
 *
 * @param statBlock - The stat block to check against
 * @param statName - Name of the stat to use
 * @param options - Check options including difficulty, dice, advantage, etc.
 * @returns Check result with success, rolls, modifiers, and margin
 *
 * @example
 * ```typescript
 * const stats = createStatBlock({ strength: { base: 14 } })
 * const result = check(stats, 'strength', { difficulty: 15 })
 * // result.success, result.total, result.margin
 * ```
 *
 * @throws {TypeError} If stat doesn't exist
 */
export function check(
  statBlock: StatBlock,
  statName: string,
  options: CheckOptions
): CheckResult {
  const statValue = statBlock.get(statName)
  if (statValue === undefined) {
    throw new TypeError(`Cannot check non-existent stat: "${statName}"`)
  }

  // Calculate modifier
  let modifier: number
  if (options.modifier !== undefined) {
    // Use override
    modifier = options.modifier
  } else {
    // Calculate from stat value using modifierFormula or default
    const modifierFormula = (statBlock as any)._modifierFormula
    if (modifierFormula) {
      modifier = modifierFormula(statValue)
    } else {
      // Default: Math.floor((stat - 10) / 2)
      modifier = Math.floor((statValue - 10) / 2)
    }
  }

  const bonus = options.bonus ?? 0
  const dice = options.dice ?? '1d20'

  // Handle advantage/disadvantage
  let rolls: number[]
  let selectedRoll: number

  if (options.advantage && options.disadvantage) {
    // Cancel out - roll normally
    const result = roll(dice)
    // Extract individual die values from the roll
    rolls = result.rolls.map(r => r.value)
    selectedRoll = result.total - result.modifier
  } else if (options.advantage) {
    // Roll twice, take higher
    const roll1 = roll(dice)
    const roll2 = roll(dice)
    const value1 = roll1.total - roll1.modifier
    const value2 = roll2.total - roll2.modifier
    rolls = [value1, value2]
    selectedRoll = Math.max(value1, value2)
  } else if (options.disadvantage) {
    // Roll twice, take lower
    const roll1 = roll(dice)
    const roll2 = roll(dice)
    const value1 = roll1.total - roll1.modifier
    const value2 = roll2.total - roll2.modifier
    rolls = [value1, value2]
    selectedRoll = Math.min(value1, value2)
  } else {
    // Normal roll
    const result = roll(dice)
    // Extract individual die values from the roll
    rolls = result.rolls.map(r => r.value)
    selectedRoll = result.total - result.modifier
  }

  const total = selectedRoll + modifier + bonus
  const success = total >= options.difficulty
  const margin = total - options.difficulty

  return {
    success,
    roll: selectedRoll,
    rolls,
    modifier,
    bonus,
    total,
    difficulty: options.difficulty,
    margin,
  }
}

/**
 * Creates a derived stat that automatically recalculates when dependencies change.
 *
 * Derived stats are read-only and computed from other stats using a formula.
 *
 * @param statBlock - The stat block to add the derived stat to
 * @param name - Name for the derived stat
 * @param formula - Function that computes the stat value
 * @returns Derived stat accessor
 *
 * @example
 * ```typescript
 * const stats = createStatBlock({ strength: { base: 16 } })
 * createDerivedStat(stats, 'carryCapacity', s => s.get('strength')! * 10)
 * stats.get('carryCapacity') // 160
 * ```
 *
 * @throws {CircularDependencyError} If circular dependency detected
 */
export function createDerivedStat(
  statBlock: StatBlock,
  name: string,
  formula: (statBlock: StatBlock) => number
): { getValue: () => number } {
  const internal = statBlock as any

  // Initialize dependency tracking if needed
  if (!internal._derivedDependencies) {
    internal._derivedDependencies = new Map<string, Set<string>>()
  }

  const dependencies = new Set<string>()
  const cycle: string[] = []

  // Helper to get all transitive dependencies of a stat
  const getTransitiveDependencies = (statName: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(statName)) {
      return new Set()
    }
    visited.add(statName)

    const deps = internal._derivedDependencies.get(statName)
    if (!deps) {
      return new Set()
    }

    const result = new Set(deps)
    for (const dep of deps) {
      const transitive = getTransitiveDependencies(dep, visited)
      for (const t of transitive) {
        result.add(t)
      }
    }
    return result
  }

  // Create a proxy to detect which stats the formula accesses
  const proxy = new Proxy(statBlock, {
    get(target, prop) {
      if (prop === 'get') {
        return (statName: string) => {
          // Check if trying to reference itself
          if (statName === name) {
            cycle.push(name)
            throw new CircularDependencyError('Circular dependency detected in derived stat', cycle)
          }

          dependencies.add(statName)

          // Check if statName (which might be derived) depends on 'name'
          const transitiveDeps = getTransitiveDependencies(statName)
          if (transitiveDeps.has(name)) {
            cycle.push(statName, ...Array.from(transitiveDeps), name)
            throw new CircularDependencyError('Circular dependency detected in derived stat', cycle)
          }

          return target.get(statName)
        }
      }
      return (target as any)[prop]
    },
  })

  // Test the formula for circular dependencies
  try {
    formula(proxy)
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      throw error
    }
    // Other errors are ignored during dependency checking
  }

  // Store dependencies
  internal._derivedDependencies.set(name, dependencies)

  // Add the derived stat to the stat block using internal methods
  if (internal._addDerivedStat) {
    internal._addDerivedStat(name, formula)
  }

  return {
    getValue: () => {
      try {
        return formula(statBlock)
      } catch (error) {
        console.error(`Error calculating derived stat "${name}":`, error)
        return 0
      }
    },
  }
}

/**
 * Performs a saving throw (simplified check returning only boolean).
 *
 * @param statBlock - The stat block to check
 * @param statName - Name of the stat to use
 * @param difficulty - Target DC
 * @returns true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const stats = createStatBlock({ dexterity: { base: 14 } })
 * const passed = saveThrow(stats, 'dexterity', 15)
 * ```
 */
export function saveThrow(
  statBlock: StatBlock,
  statName: string,
  difficulty: number
): boolean {
  const result = check(statBlock, statName, { difficulty })
  return result.success
}

/**
 * Performs a contest between two stat blocks or raw modifiers.
 *
 * @param a - First stat block or modifier value
 * @param b - Second stat block or modifier value (or stat name if a is StatBlock)
 * @param c - Second stat block (if using stat blocks)
 * @param d - Second stat name (if using stat blocks)
 * @param options - Contest options
 * @returns Contest result with winner and margin
 *
 * @example
 * ```typescript
 * // With stat blocks
 * const result = contest(heroStats, 'strength', monsterStats, 'strength')
 *
 * // With raw modifiers
 * const result = contest(5, 3)
 * ```
 */
export function contest(
  a: StatBlock | number,
  b: string | number,
  c?: StatBlock,
  d?: string,
  options?: ContestOptions
): ContestResult {
  const dice = options?.dice ?? '1d20'

  let modifierA: number
  let modifierB: number

  if (typeof a === 'number' && typeof b === 'number') {
    // Raw modifiers
    modifierA = a
    modifierB = b
  } else if (typeof a === 'object' && typeof b === 'string' && c && typeof d === 'string') {
    // Stat blocks
    const statA = a.get(b)
    const statB = c.get(d)

    if (statA === undefined) {
      throw new TypeError(`Cannot contest with non-existent stat: "${b}"`)
    }
    if (statB === undefined) {
      throw new TypeError(`Cannot contest with non-existent stat: "${d}"`)
    }

    // Use custom modifierFormula if available
    const modifierFormulaA = (a as any)._modifierFormula
    const modifierFormulaB = (c as any)._modifierFormula

    modifierA = modifierFormulaA ? modifierFormulaA(statA) : Math.floor((statA - 10) / 2)
    modifierB = modifierFormulaB ? modifierFormulaB(statB) : Math.floor((statB - 10) / 2)
  } else {
    throw new TypeError('Invalid contest arguments')
  }

  const rollA = roll(dice)
  const rollB = roll(dice)

  const rollValueA = rollA.total - rollA.modifier
  const rollValueB = rollB.total - rollB.modifier

  const totalA = rollValueA + modifierA
  const totalB = rollValueB + modifierB

  let winner: 'a' | 'b' | 'tie'
  if (totalA > totalB) {
    winner = 'a'
  } else if (totalB > totalA) {
    winner = 'b'
  } else {
    winner = 'tie'
  }

  const margin = Math.abs(totalA - totalB)

  return {
    winner,
    rolls: { a: rollValueA, b: rollValueB },
    totals: { a: totalA, b: totalB },
    margin,
  }
}

/**
 * Selects a random entry from a weighted table.
 *
 * @param entries - Array of weighted entries
 * @returns The selected entry's value
 *
 * @example
 * ```typescript
 * const loot = rollTable([
 *   { weight: 10, value: 'common' },
 *   { weight: 1, value: 'rare' }
 * ])
 * ```
 *
 * @throws {ValidationError} If entries invalid
 */
export function rollTable<T>(entries: RollTableEntry<T>[]): T {
  if (entries.length === 0) {
    throw new ValidationError('Roll table cannot be empty')
  }

  // Validate weights
  for (const entry of entries) {
    if (entry.weight < 0) {
      throw new ValidationError('Roll table weights cannot be negative')
    }
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)

  if (totalWeight === 0) {
    throw new ValidationError('Roll table must have at least one non-zero weight')
  }

  // Select random entry
  const random = Math.random() * totalWeight
  let cumulative = 0

  for (const entry of entries) {
    cumulative += entry.weight
    if (random < cumulative) {
      return entry.value
    }
  }

  // Fallback to last entry (shouldn't happen)
  return entries[entries.length - 1].value
}
