import { ValidationError, VersionError } from '../errors'
import type {
  StatDefinitions,
  StatBlock,
  StatBlockOptions,
  Modifier,
  ModifierInfo,
  HistoryEntry,
  StatChangeEvent,
  SerializedStatBlock,
} from '../types'

type InternalModifier = {
  value: number
  source: string
  type: 'flat' | 'multiply'
  duration: 'permanent' | number
  remainingDuration: number | typeof Infinity
}

type StatData = {
  base: number
  min?: number
  max?: number
  modifiers: InternalModifier[]
  isDerived: boolean
  derivedFormula?: (statBlock: StatBlock) => number
}

/**
 * Creates a new stat block with the given stat definitions.
 *
 * A stat block manages a collection of numeric stats with base values, bounds,
 * and modifiers. Supports temporary/permanent modifiers, duration tracking,
 * and change events.
 *
 * @param definitions - Object mapping stat names to their definitions
 * @param options - Optional configuration
 * @param options.historyLimit - Maximum roll history entries (default: 100, 0 to disable)
 * @param options.modifierFormula - Custom formula for calculating stat modifiers in checks
 * @param options.fromJSON - Restore state from serialized data
 * @returns A new StatBlock instance
 *
 * @example
 * ```typescript
 * const stats = createStatBlock({
 *   strength: { base: 14, min: 1, max: 20 },
 *   health: { base: 100, min: 0 }
 * })
 *
 * stats.addModifier('strength', { value: 2, source: 'buff' })
 * stats.get('strength') // 16
 * ```
 *
 * @throws {ValidationError} If min > max in any stat definition
 */
export function createStatBlock(
  definitions: StatDefinitions,
  options?: StatBlockOptions & { fromJSON?: SerializedStatBlock }
): StatBlock {
  const stats = new Map<string, StatData>()
  const rollHistory: HistoryEntry[] = []
  const changeListeners: Array<(event: StatChangeEvent) => void> = []
  const statListeners = new Map<string, Array<(event: StatChangeEvent) => void>>()

  const historyLimit = options?.historyLimit ?? 100
  const modifierFormula = options?.modifierFormula

  // Initialize stats
  for (const [name, def] of Object.entries(definitions)) {
    // Validate bounds
    if (def.min !== undefined && def.max !== undefined && def.min > def.max) {
      throw new ValidationError(`Min (${def.min}) cannot be greater than max (${def.max})`, name)
    }

    // Clamp initial base value
    let base = def.base
    if (def.min !== undefined) base = Math.max(base, def.min)
    if (def.max !== undefined) base = Math.min(base, def.max)

    stats.set(name, {
      base,
      min: def.min,
      max: def.max,
      modifiers: [],
      isDerived: false,
    })
  }

  // Restore from JSON if provided
  if (options?.fromJSON) {
    const data = options.fromJSON

    // Validate version (default to 1 if missing for backwards compatibility)
    const version = data.version ?? 1
    if (version !== 1) {
      throw new VersionError(`Unsupported version: ${version}`, version)
    }

    for (const [name, base] of Object.entries(data.stats)) {
      if (stats.has(name)) {
        const stat = stats.get(name)!
        stat.base = clampValue(base, stat.min, stat.max)
      } else {
        console.warn(`Unknown stat in JSON: ${name}`)
      }
    }

    for (const [name, mods] of Object.entries(data.modifiers)) {
      if (stats.has(name)) {
        for (const mod of mods) {
          addModifier(name, mod)
        }
      } else {
        console.warn(`Unknown stat in JSON modifiers: ${name}`)
      }
    }
  }

  function clampValue(value: number, min?: number, max?: number): number {
    let result = value
    if (min !== undefined) result = Math.max(result, min)
    if (max !== undefined) result = Math.min(result, max)
    return result
  }

  function calculateEffectiveValue(name: string): number {
    const stat = stats.get(name)
    if (!stat) return 0

    // Handle derived stats
    if (stat.isDerived && stat.derivedFormula) {
      try {
        return stat.derivedFormula(publicAPI)
      } catch (error) {
        console.error(`Error calculating derived stat "${name}":`, error)
        return 0
      }
    }

    let value = stat.base

    // Apply flat modifiers first
    const flatMods = stat.modifiers.filter(m => m.type === 'flat')
    for (const mod of flatMods) {
      value += mod.value
    }

    // Apply multiply modifiers in order
    const multiplyMods = stat.modifiers.filter(m => m.type === 'multiply')
    for (const mod of multiplyMods) {
      value *= mod.value
    }

    return value
  }

  function fireChangeEvent(
    stat: string,
    oldValue: number,
    newValue: number,
    baseChanged: boolean,
    modifiersChanged: boolean
  ): void {
    const event: StatChangeEvent = {
      stat,
      oldValue,
      newValue,
      baseChanged,
      modifiersChanged,
    }

    // Fire global listeners
    for (const listener of changeListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('onChange callback error:', error)
      }
    }

    // Fire stat-specific listeners
    const listeners = statListeners.get(stat)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          console.error('onStat callback error:', error)
        }
      }
    }
  }

  function captureDerivedStatValues(): Map<string, number> {
    const values = new Map<string, number>()
    for (const [name, stat] of stats.entries()) {
      if (stat.isDerived) {
        values.set(name, calculateEffectiveValue(name))
      }
    }
    return values
  }

  function fireDerivedStatEvents(oldValues: Map<string, number>): void {
    for (const [name, oldValue] of oldValues.entries()) {
      const newValue = calculateEffectiveValue(name)
      if (oldValue !== newValue) {
        fireChangeEvent(name, oldValue, newValue, false, false)
      }
    }
  }

  function get(statName: string): number | undefined {
    if (!stats.has(statName)) return undefined
    return calculateEffectiveValue(statName)
  }

  function getBase(statName: string): number | undefined {
    const stat = stats.get(statName)
    return stat?.base
  }

  function set(statName: string, value: number): number {
    const stat = stats.get(statName)
    if (!stat) {
      throw new TypeError(`Cannot set non-existent stat: "${statName}"`)
    }
    if (stat.isDerived) {
      throw new TypeError(`Cannot set derived stat "${statName}"`)
    }

    const oldValue = calculateEffectiveValue(statName)
    const derivedOldValues = captureDerivedStatValues()

    stat.base = clampValue(value, stat.min, stat.max)

    const newValue = calculateEffectiveValue(statName)

    if (oldValue !== newValue) {
      fireChangeEvent(statName, oldValue, newValue, true, false)
      fireDerivedStatEvents(derivedOldValues)
    }

    return stat.base
  }

  function modify(statName: string, delta: number): number {
    const stat = stats.get(statName)
    if (!stat) {
      throw new TypeError(`Cannot modify non-existent stat: "${statName}"`)
    }
    if (stat.isDerived) {
      throw new TypeError(`Cannot modify derived stat "${statName}"`)
    }

    const oldValue = calculateEffectiveValue(statName)
    const derivedOldValues = captureDerivedStatValues()

    stat.base = clampValue(stat.base + delta, stat.min, stat.max)
    const newValue = calculateEffectiveValue(statName)

    if (oldValue !== newValue) {
      fireChangeEvent(statName, oldValue, newValue, true, false)
      fireDerivedStatEvents(derivedOldValues)
    }

    return stat.base
  }

  function has(statName: string): boolean {
    return stats.has(statName)
  }

  function statNames(): string[] {
    return Array.from(stats.keys())
  }

  function addModifier(statName: string, modifier: Modifier): Modifier {
    const stat = stats.get(statName)
    if (!stat) {
      throw new TypeError(`Cannot add modifier to non-existent stat: "${statName}"`)
    }
    if (stat.isDerived) {
      throw new TypeError(`Cannot add modifier to derived stat "${statName}"`)
    }

    const oldValue = calculateEffectiveValue(statName)
    const derivedOldValues = captureDerivedStatValues()

    // Check if modifier with this source already exists
    const existingIndex = stat.modifiers.findIndex(m => m.source === modifier.source)

    const type = modifier.type ?? 'flat'
    let duration: 'permanent' | number = 'permanent'
    let remainingDuration: number | typeof Infinity = Infinity

    if (modifier.duration !== undefined) {
      if (modifier.duration === 'permanent') {
        duration = 'permanent'
        remainingDuration = Infinity
      } else if (modifier.duration === 'temporary') {
        duration = 1
        remainingDuration = 1
      } else {
        duration = modifier.duration
        remainingDuration = modifier.duration
      }
    }

    const internalMod: InternalModifier = {
      value: modifier.value,
      source: modifier.source,
      type,
      duration,
      remainingDuration,
    }

    if (existingIndex >= 0) {
      // Replace existing modifier
      stat.modifiers[existingIndex] = internalMod
    } else {
      // Add new modifier
      stat.modifiers.push(internalMod)
    }

    const newValue = calculateEffectiveValue(statName)

    if (oldValue !== newValue) {
      fireChangeEvent(statName, oldValue, newValue, false, true)
      fireDerivedStatEvents(derivedOldValues)
    }

    return {
      value: modifier.value,
      source: modifier.source,
      type,
      duration: modifier.duration ?? 'permanent',
    }
  }

  function removeModifier(statName: string, source: string): boolean {
    const stat = stats.get(statName)
    if (!stat) return false

    const oldValue = calculateEffectiveValue(statName)
    const derivedOldValues = captureDerivedStatValues()
    const initialLength = stat.modifiers.length

    stat.modifiers = stat.modifiers.filter(m => m.source !== source)

    const removed = stat.modifiers.length < initialLength

    if (removed) {
      const newValue = calculateEffectiveValue(statName)
      if (oldValue !== newValue) {
        fireChangeEvent(statName, oldValue, newValue, false, true)
        fireDerivedStatEvents(derivedOldValues)
      }
    }

    return removed
  }

  function getModifiers(statName: string): ModifierInfo[] | undefined {
    const stat = stats.get(statName)
    if (!stat) return undefined

    return stat.modifiers.map(m => ({
      value: m.value,
      source: m.source,
      type: m.type,
      duration: m.remainingDuration === Infinity ? 'permanent' : m.remainingDuration,
    }))
  }

  function clearModifiers(statName?: string): number {
    let count = 0

    if (statName !== undefined) {
      const stat = stats.get(statName)
      if (stat) {
        const oldValue = calculateEffectiveValue(statName)
        const derivedOldValues = captureDerivedStatValues()
        count = stat.modifiers.length
        stat.modifiers = []
        const newValue = calculateEffectiveValue(statName)
        if (oldValue !== newValue && count > 0) {
          fireChangeEvent(statName, oldValue, newValue, false, true)
          fireDerivedStatEvents(derivedOldValues)
        }
      }
    } else {
      const derivedOldValues = captureDerivedStatValues()
      for (const [name, stat] of stats.entries()) {
        const oldValue = calculateEffectiveValue(name)
        const modCount = stat.modifiers.length
        stat.modifiers = []
        count += modCount
        const newValue = calculateEffectiveValue(name)
        if (oldValue !== newValue && modCount > 0) {
          fireChangeEvent(name, oldValue, newValue, false, true)
        }
      }
      // Fire derived stat events once after all modifiers cleared
      fireDerivedStatEvents(derivedOldValues)
    }

    return count
  }

  function getRemainingDuration(statName: string, source: string): number | undefined {
    const stat = stats.get(statName)
    if (!stat) return undefined

    const mod = stat.modifiers.find(m => m.source === source)
    if (!mod) return undefined

    return mod.remainingDuration === Infinity ? Infinity : mod.remainingDuration
  }

  function tick(): string[] {
    const expired: string[] = []
    const derivedOldValues = captureDerivedStatValues()

    for (const [name, stat] of stats.entries()) {
      const toRemove: string[] = []
      const oldValue = calculateEffectiveValue(name)

      for (const mod of stat.modifiers) {
        if (mod.remainingDuration !== Infinity) {
          mod.remainingDuration--
          if (mod.remainingDuration <= 0) {
            toRemove.push(mod.source)
            expired.push(mod.source)
          }
        }
      }

      if (toRemove.length > 0) {
        stat.modifiers = stat.modifiers.filter(m => !toRemove.includes(m.source))
        const newValue = calculateEffectiveValue(name)
        if (oldValue !== newValue) {
          fireChangeEvent(name, oldValue, newValue, false, true)
        }
      }
    }

    // Fire derived stat events after all tick processing
    fireDerivedStatEvents(derivedOldValues)

    return expired
  }

  function getRollHistory(limit?: number): HistoryEntry[] {
    if (historyLimit === 0) return []
    if (limit === undefined) return [...rollHistory]
    return rollHistory.slice(0, limit)
  }

  function clearRollHistory(): void {
    rollHistory.length = 0
  }

  function onChange(callback: (event: StatChangeEvent) => void): () => void {
    changeListeners.push(callback)
    return () => {
      const index = changeListeners.indexOf(callback)
      if (index >= 0) {
        changeListeners.splice(index, 1)
      }
    }
  }

  function onStat(statName: string, callback: (event: StatChangeEvent) => void): () => void {
    const stat = stats.get(statName)
    if (!stat) {
      throw new TypeError(`Cannot listen to non-existent stat: "${statName}"`)
    }

    if (!statListeners.has(statName)) {
      statListeners.set(statName, [])
    }
    statListeners.get(statName)!.push(callback)

    return () => {
      const listeners = statListeners.get(statName)
      if (listeners) {
        const index = listeners.indexOf(callback)
        if (index >= 0) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  function isDerived(name: string): boolean {
    const stat = stats.get(name)
    return stat?.isDerived ?? false
  }

  function toJSON(): SerializedStatBlock {
    const statsData: Record<string, number> = {}
    const modifiersData: SerializedStatBlock['modifiers'] = {}

    for (const [name, stat] of stats.entries()) {
      if (!stat.isDerived) {
        statsData[name] = stat.base

        if (stat.modifiers.length > 0) {
          modifiersData[name] = stat.modifiers.map(m => ({
            value: m.value,
            source: m.source,
            type: m.type,
            duration: m.remainingDuration === Infinity ? 'permanent' : m.remainingDuration,
          }))
        }
      }
    }

    return {
      version: 1,
      stats: statsData,
      modifiers: modifiersData,
    }
  }

  function addDerivedStat(name: string, formula: (statBlock: StatBlock) => number): void {
    // Track dependencies to update derived stats when sources change
    stats.set(name, {
      base: 0,
      modifiers: [],
      isDerived: true,
      derivedFormula: formula,
    })
  }

  const publicAPI: StatBlock = {
    get,
    getBase,
    set,
    modify,
    has,
    stats: statNames,
    addModifier,
    removeModifier,
    getModifiers,
    clearModifiers,
    getRemainingDuration,
    tick,
    getRollHistory,
    clearRollHistory,
    onChange,
    onStat,
    isDerived,
    toJSON,
  }

  // Add internal methods and properties
  ;(publicAPI as any)._addDerivedStat = addDerivedStat
  ;(publicAPI as any)._modifierFormula = modifierFormula

  return publicAPI
}
