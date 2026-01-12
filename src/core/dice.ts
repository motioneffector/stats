import { ParseError } from '../errors'
import type { RollResult, RollOptions } from '../types'

const MAX_EXPLOSION_DEPTH = 100

type DieRoll = {
  value: number
  exploded: boolean
  rerolled: boolean
}

type ParsedNotation = {
  count: number
  sides: number
  modifiers: number
  keepHighest?: number
  keepLowest?: number
  dropHighest?: number
  dropLowest?: number
  exploding: boolean
  rerollConditions: Array<{
    operator: '=' | '<' | '>' | '<=' | '>='
    value: number
  }>
}

function parseNotation(notation: string): ParsedNotation {
  const trimmed = notation.trim()

  if (!trimmed) {
    throw new ParseError('Dice notation cannot be empty', notation)
  }

  // Remove all spaces for easier parsing
  const clean = trimmed.replace(/\s+/g, '')

  // Check for negative dice count
  if (clean.match(/^-\d+[dD]/i)) {
    throw new ParseError('Cannot roll negative number of dice', notation)
  }

  // Check for negative die sides
  if (clean.match(/[dD]-\d+/i)) {
    throw new ParseError('Die cannot have negative sides', notation)
  }

  // Match the basic pattern: [count]d[sides][modifiers]
  const basicPattern = /^(\d*)([dD])(\d+)/i
  const match = clean.match(basicPattern)

  if (!match) {
    throw new ParseError(`Invalid dice notation: "${notation}"`, notation)
  }

  const countStr = match[1]!
  const sidesStr = match[3]!

  // Parse count and sides
  if (countStr.includes('.')) {
    throw new ParseError('Dice count must be an integer', notation)
  }
  if (sidesStr.includes('.')) {
    throw new ParseError('Die size must be an integer', notation)
  }

  const count = countStr === '' ? 1 : parseInt(countStr, 10)
  const sides = parseInt(sidesStr, 10)

  if (count === 0) {
    throw new ParseError('Cannot roll zero dice', notation)
  }
  if (count < 0) {
    throw new ParseError('Cannot roll negative number of dice', notation)
  }
  if (sides === 0) {
    throw new ParseError('Die must have at least 1 side', notation)
  }
  if (sides < 0) {
    throw new ParseError('Die cannot have negative sides', notation)
  }

  // Parse remaining modifiers
  const remainder = clean.slice(match[0].length)

  const parsed: ParsedNotation = {
    count,
    sides,
    modifiers: 0,
    exploding: false,
    rerollConditions: [],
  }

  let pos = 0
  while (pos < remainder.length) {
    const char = remainder[pos]

    // Numeric modifiers
    if (char === '+' || char === '-') {
      const sign = char === '+' ? 1 : -1
      pos++

      // Check for invalid ++ or +-
      if (pos < remainder.length && (remainder[pos] === '+' || remainder[pos] === '-')) {
        throw new ParseError('Invalid modifier syntax', notation)
      }

      const numMatch = remainder.slice(pos).match(/^(\d+)/)
      if (!numMatch) {
        throw new ParseError('Incomplete modifier', notation)
      }

      const numStr = numMatch[1]!
      if (numStr.includes('.')) {
        throw new ParseError('Modifiers must be integers', notation)
      }

      parsed.modifiers += sign * parseInt(numStr, 10)
      pos += numStr.length
      continue
    }

    // Keep highest
    if (remainder.slice(pos).match(/^[kK][hH]/i)) {
      pos += 2
      const numMatch = remainder.slice(pos).match(/^(\d+)/)
      if (numMatch) {
        parsed.keepHighest = parseInt(numMatch[1]!, 10)
        pos += numMatch[1]!.length
      }
      continue
    }

    // Keep lowest
    if (remainder.slice(pos).match(/^[kK][lL]/i)) {
      pos += 2
      const numMatch = remainder.slice(pos).match(/^(\d+)/)
      if (numMatch) {
        parsed.keepLowest = parseInt(numMatch[1]!, 10)
        pos += numMatch[1]!.length
      }
      continue
    }

    // Drop highest
    if (remainder.slice(pos).match(/^[dD][hH]/i)) {
      pos += 2
      const numMatch = remainder.slice(pos).match(/^(\d+)/)
      if (numMatch) {
        parsed.dropHighest = parseInt(numMatch[1]!, 10)
        pos += numMatch[1]!.length
      }
      continue
    }

    // Drop lowest
    if (remainder.slice(pos).match(/^[dD][lL]/i)) {
      pos += 2
      const numMatch = remainder.slice(pos).match(/^(\d+)/)
      if (numMatch) {
        parsed.dropLowest = parseInt(numMatch[1]!, 10)
        pos += numMatch[1]!.length
      }
      continue
    }

    // Exploding
    if (char === '!') {
      parsed.exploding = true
      pos++
      continue
    }

    // Reroll
    if (char === 'r' || char === 'R') {
      pos++
      const opMatch = remainder.slice(pos).match(/^(<=|>=|<|>|=)?(\d+)/)
      if (opMatch) {
        const operator = (opMatch[1] || '=') as '=' | '<' | '>' | '<=' | '>='
        const value = parseInt(opMatch[2]!, 10)
        parsed.rerollConditions.push({ operator, value })
        pos += opMatch[0].length
      } else {
        // r without number defaults to r1
        parsed.rerollConditions.push({ operator: '=', value: 1 })
      }
      continue
    }

    throw new ParseError(`Unexpected character: "${char}"`, notation)
  }

  return parsed
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function shouldReroll(value: number, conditions: ParsedNotation['rerollConditions']): boolean {
  for (const condition of conditions) {
    switch (condition.operator) {
      case '=':
        if (value === condition.value) return true
        break
      case '<':
        if (value < condition.value) return true
        break
      case '>':
        if (value > condition.value) return true
        break
      case '<=':
        if (value <= condition.value) return true
        break
      case '>=':
        if (value >= condition.value) return true
        break
    }
  }
  return false
}

function rollSingleDie(
  sides: number,
  exploding: boolean,
  rerollConditions: ParsedNotation['rerollConditions']
): DieRoll[] {
  const rolls: DieRoll[] = []
  let value = rollDie(sides)
  let explosionCount = 1 // Start at 1 since we've rolled once

  rolls.push({ value, exploded: false, rerolled: false })

  // Handle exploding
  while (exploding && value === sides && explosionCount < MAX_EXPLOSION_DEPTH) {
    value = rollDie(sides)
    rolls.push({ value, exploded: true, rerolled: false })
    explosionCount++
  }

  // Handle reroll (only once, on the last roll after explosions)
  if (rerollConditions.length > 0) {
    const lastIndex = rolls.length - 1
    const lastRoll = rolls[lastIndex]!
    if (shouldReroll(lastRoll.value, rerollConditions)) {
      const originalValue = lastRoll.value
      const originalExploded = lastRoll.exploded
      const newValue = rollDie(sides)
      // Keep original in history, mark it as rerolled
      rolls[lastIndex] = { value: originalValue, exploded: originalExploded, rerolled: true }
      // Add the new roll
      rolls.push({ value: newValue, exploded: false, rerolled: false })
    }
  }

  return rolls
}

function selectKeptDice(
  rolls: number[],
  keepHighest?: number,
  keepLowest?: number,
  dropHighest?: number,
  dropLowest?: number
): number[] {
  if (rolls.length === 0) {
    return []
  }

  const sorted = [...rolls].sort((a, b) => a - b)

  let keep = rolls.length

  // Calculate how many to keep based on modifiers
  if (keepHighest !== undefined) {
    keep = Math.min(keep, keepHighest)
  }
  if (keepLowest !== undefined) {
    keep = Math.min(keep, keepLowest)
  }
  if (dropHighest !== undefined) {
    keep = Math.min(keep, rolls.length - dropHighest)
  }
  if (dropLowest !== undefined) {
    keep = Math.min(keep, rolls.length - dropLowest)
  }

  // Ensure we don't keep negative dice
  keep = Math.max(0, keep)

  // If keeping 0, return empty array
  if (keep === 0) {
    return []
  }

  // Determine which dice to keep
  if (keepHighest !== undefined || dropLowest !== undefined) {
    // Keep highest N
    return sorted.slice(-keep).sort((a, b) => a - b)
  } else if (keepLowest !== undefined || dropHighest !== undefined) {
    // Keep lowest N
    return sorted.slice(0, keep)
  } else {
    // Keep all
    return sorted
  }
}

/**
 * Roll dice using standard RPG notation.
 *
 * Supports various dice notation formats including:
 * - Basic: "1d20", "2d6+3"
 * - Keep/Drop: "4d6kh3", "2d20kl1"
 * - Exploding: "1d6!", "3d10!"
 * - Reroll: "1d20r1", "4d6r<=2"
 *
 * @param notation - Dice notation string (e.g., "2d6+3", "4d6kh3")
 * @param _options - Reserved for future options (currently unused)
 * @returns Roll result containing total, individual rolls, kept dice, notation, and modifier
 * @throws {ParseError} If notation is invalid or malformed
 *
 * @example
 * ```typescript
 * roll("2d6+3")     // Roll 2d6 and add 3
 * roll("4d6kh3")    // Roll 4d6, keep highest 3
 * roll("1d20!")     // Roll 1d20 with exploding dice
 * ```
 */
export function roll(notation: string, _options?: RollOptions): RollResult {
  const parsed = parseNotation(notation)

  // Roll all dice
  const allDieRolls: DieRoll[][] = []
  for (let i = 0; i < parsed.count; i++) {
    allDieRolls.push(
      rollSingleDie(parsed.sides, parsed.exploding, parsed.rerollConditions)
    )
  }

  // Flatten rolls - for keep/drop, we need the final value of each die
  const diceValues: number[] = []
  const allRolls: number[] = []

  for (const dieRolls of allDieRolls) {
    // All individual rolls for history
    for (const roll of dieRolls) {
      allRolls.push(roll.value)
    }

    // For keep/drop purposes, sum rolls appropriately
    // Rerolled dice are replaced, but explosions before reroll are kept
    let dieValue = 0
    let rerollIndex = -1

    // Find if there was a reroll
    for (let i = 0; i < dieRolls.length; i++) {
      if (dieRolls[i]!.rerolled) {
        rerollIndex = i
        break
      }
    }

    if (rerollIndex >= 0) {
      // Sum all rolls before the rerolled one
      for (let i = 0; i < rerollIndex; i++) {
        dieValue += dieRolls[i]!.value
      }
      // Add the reroll value (which is after the rerolled index)
      if (rerollIndex + 1 < dieRolls.length) {
        dieValue += dieRolls[rerollIndex + 1]!.value
      }
    } else {
      // No reroll, sum all rolls (explosions)
      dieValue = dieRolls.reduce((sum, r) => sum + r.value, 0)
    }

    diceValues.push(dieValue)
  }

  // Apply keep/drop
  const kept = selectKeptDice(
    diceValues,
    parsed.keepHighest,
    parsed.keepLowest,
    parsed.dropHighest,
    parsed.dropLowest
  )

  // Calculate total
  const diceTotal = kept.reduce((sum, val) => sum + val, 0)
  const total = diceTotal + parsed.modifiers

  return {
    total,
    rolls: allRolls,
    kept,
    notation,
    modifier: parsed.modifiers,
  }
}
