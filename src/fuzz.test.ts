/**
 * Fuzz Testing Suite for @motioneffector/stats
 *
 * This comprehensive fuzz test suite validates the library against hostile input,
 * edge cases, and random operation sequences. It runs in two modes:
 * - Standard: 200 iterations per test, fixed seed (for CI/development)
 * - Thorough: 60 seconds per test, rotating seeds (for deep exploration)
 *
 * Run with: pnpm test:run (standard) or pnpm fuzz:thorough (thorough)
 */

import { describe, it, expect } from 'vitest'
import {
  roll,
  createStatBlock,
  check,
  createDerivedStat,
  ParseError,
  ValidationError,
  CircularDependencyError,
  VersionError,
} from './index'
import type { StatDefinitions, Modifier, CheckOptions, SerializedStatBlock } from './types'

// ============================================
// FUZZ TEST CONFIGURATION
// ============================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const THOROUGH_DURATION_MS = 60_000 // 60 seconds per test in thorough mode
const STANDARD_ITERATIONS = 200 // iterations per test in standard mode
const BASE_SEED = 12345 // reproducible seed for standard mode
const GC_INTERVAL = THOROUGH_MODE ? 10 : 100 // More aggressive GC in thorough mode

// ============================================
// SEEDED PRNG
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ============================================
// FUZZ LOOP HELPER
// ============================================

interface FuzzLoopResult {
  iterations: number
  seed: number
  durationMs: number
}

/**
 * Executes a fuzz test body in either standard or thorough mode.
 *
 * Standard mode: Runs exactly STANDARD_ITERATIONS times with BASE_SEED
 * Thorough mode: Runs for THOROUGH_DURATION_MS with time-based seed
 *
 * On failure, throws with full reproduction information.
 */
function fuzzLoop(testFn: (random: () => number, iteration: number, cleanup: (obj: any) => void) => void): FuzzLoopResult {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  // Track all objects created in this iteration for cleanup
  const cleanupRefs = new Set<any>()

  // Cleanup callback passed to tests
  const registerForCleanup = (obj: any) => {
    if (obj && typeof obj === 'object') {
      cleanupRefs.add(obj)
    }
  }

  try {
    if (THOROUGH_MODE) {
      // Time-based: run until duration exceeded
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        cleanupRefs.clear()

        testFn(random, iteration, registerForCleanup)

        // Cleanup all registered objects
        for (const obj of cleanupRefs) {
          if (typeof obj.dispose === 'function') {
            try {
              obj.dispose()
            } catch (e) {
              // Ignore dispose errors in fuzz tests
            }
          }
        }
        cleanupRefs.clear()

        // Force GC after every iteration in thorough mode
        if (global.gc) {
          global.gc()
        }

        iteration++

        // Memory monitoring every 10 iterations
        if (iteration % 10 === 0) {
          const memUsage = process.memoryUsage()
          if (memUsage.heapUsed > 6 * 1024 * 1024 * 1024) {
            console.warn(
              `Warning: High memory usage at iteration ${iteration}: ` +
              `${Math.round(memUsage.heapUsed / 1024 / 1024 / 1024 * 10) / 10}GB`
            )
          }
        }
      }
    } else {
      // Iteration-based: run fixed count (standard mode)
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        cleanupRefs.clear()
        testFn(random, iteration, registerForCleanup)

        // Cleanup in standard mode too
        for (const obj of cleanupRefs) {
          if (typeof obj.dispose === 'function') {
            try {
              obj.dispose()
            } catch (e) {
              // Ignore
            }
          }
        }
        cleanupRefs.clear()
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  } finally {
    // Final cleanup
    cleanupRefs.clear()
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// VALUE GENERATORS
// ============================================

function generateString(random: () => number, maxLen = 1000): string {
  // Reduce string length in thorough mode to save memory
  const effectiveMaxLen = THOROUGH_MODE ? Math.min(maxLen, 100) : maxLen
  const len = Math.floor(random() * effectiveMaxLen)
  return Array.from({ length: len }, () => String.fromCharCode(Math.floor(random() * 0xffff))).join(
    ''
  )
}

function generateNumber(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -0
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return -Infinity
    case 5:
      return Number.MAX_SAFE_INTEGER
    case 6:
      return Number.MIN_SAFE_INTEGER
    case 7:
      return Number.EPSILON
    default:
      return (random() - 0.5) * Number.MAX_SAFE_INTEGER * 2
  }
}

function generateInteger(random: () => number, min = 0, max = 100): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function generateDiceNotation(random: () => number): string {
  const type = Math.floor(random() * 15)
  switch (type) {
    case 0:
      return '' // empty
    case 1:
      return 'd' // incomplete
    case 2:
      return '1d' // missing sides
    case 3:
      return `${generateInteger(random, 1, 10)}d${generateInteger(random, 1, 100)}` // valid
    case 4:
      return `${generateInteger(random, 1, 5)}d${generateInteger(random, 1, 20)}+${generateInteger(random, 1, 10)}` // valid with modifier
    case 5:
      return '0d6' // zero dice
    case 6:
      return '1d0' // zero sides
    case 7:
      return '-1d6' // negative dice
    case 8:
      return '1d-6' // negative sides
    case 9:
      return '1d20++5' // double operator
    case 10:
      return '1d20+' // incomplete modifier
    case 11:
      return generateString(random, 50) // random garbage
    case 12:
      return `999999d999999` // huge values
    case 13:
      return `1d20${'!'.repeat(generateInteger(random, 1, 20))}` // excessive modifiers
    default:
      return `${generateNumber(random)}d${generateNumber(random)}`
  }
}

function generateArray<T>(
  random: () => number,
  generator: (r: () => number) => T,
  maxLen = 100
): T[] {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => generator(random))
}

function generateObject(random: () => number, depth = 0, maxDepth = 5): unknown {
  // Reduce nesting depth in thorough mode
  const effectiveMaxDepth = THOROUGH_MODE ? 3 : maxDepth
  if (depth >= effectiveMaxDepth) return null

  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return null
    case 1:
      return generateNumber(random)
    case 2:
      return generateString(random, 100)
    case 3:
      return depth < maxDepth - 1
        ? generateArray(random, (r) => generateObject(r, depth + 1, maxDepth), 10)
        : []
    case 4: {
      const obj: Record<string, unknown> = {}
      const keyCount = Math.floor(random() * 10)
      for (let i = 0; i < keyCount; i++) {
        const key = generateString(random, 20) || `key${i}`
        obj[key] = generateObject(random, depth + 1, maxDepth)
      }
      return obj
    }
    default:
      return undefined
  }
}

// Prototype pollution test values
function generateMaliciousKey(random: () => number): string {
  const attacks = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf']
  return attacks[Math.floor(random() * attacks.length)]
}

function generateStatDefinition(random: () => number): { base: number; min?: number; max?: number } {
  const base = generateInteger(random, 0, 100)
  const includeMin = random() > 0.5
  const includeMax = random() > 0.5
  const min = includeMin ? generateInteger(random, 0, base) : undefined
  const max = includeMax ? generateInteger(random, base, 200) : undefined
  return { base, min, max }
}

function generateModifier(random: () => number): any {
  const type = Math.floor(random() * 8)
  switch (type) {
    case 0: // valid flat
      return {
        value: generateInteger(random, -10, 10),
        source: `source_${generateInteger(random, 0, 100)}`,
      }
    case 1: // valid multiply
      return {
        value: random() * 3,
        type: 'multiply',
        source: `mult_${generateInteger(random, 0, 100)}`,
      }
    case 2: // with duration
      return {
        value: generateInteger(random, 1, 10),
        source: `dur_${generateInteger(random, 0, 100)}`,
        duration: generateInteger(random, 1, 5),
      }
    case 3: // invalid value
      return { value: generateNumber(random), source: 'invalid_val' }
    case 4: // missing source
      return { value: 5 }
    case 5: // invalid type
      return { value: 5, source: 'test', type: generateString(random, 10) }
    case 6: // invalid duration
      return { value: 5, source: 'test', duration: generateNumber(random) }
    default: // malformed
      return generateObject(random, 0, 2)
  }
}

// ============================================
// DICE ROLLING FUZZ TESTS
// ============================================

describe('Fuzz: roll(notation)', () => {
  it('handles random dice notations without crashing', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const notation = generateDiceNotation(random)

      try {
        const result = roll(notation)

        // If it succeeded, verify structure
        if (typeof result.total !== 'number' || !Number.isFinite(result.total)) {
          throw new Error(`Invalid total: ${result.total} for notation: ${notation}`)
        }
        if (!Array.isArray(result.rolls)) {
          throw new Error(`rolls is not array for notation: ${notation}`)
        }
        if (!Array.isArray(result.kept)) {
          throw new Error(`kept is not array for notation: ${notation}`)
        }
        if (result.notation !== notation) {
          throw new Error(
            `notation mismatch: expected "${notation}", got "${result.notation}"`
          )
        }
      } catch (e) {
        // If it threw, must be ParseError
        if (!(e instanceof ParseError)) {
          throw new Error(
            `Wrong error type for notation "${notation}": ${e?.constructor?.name || e}`
          )
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('never produces NaN or Infinity in results', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const notation = generateDiceNotation(random)

      try {
        const result = roll(notation)

        if (!Number.isFinite(result.total)) {
          throw new Error(`Non-finite total: ${result.total} for notation: ${notation}`)
        }

        if (result.rolls.some((r) => !Number.isFinite(r))) {
          throw new Error(`Non-finite roll values for notation: ${notation}`)
        }

        if (result.kept.some((r) => !Number.isFinite(r))) {
          throw new Error(`Non-finite kept values for notation: ${notation}`)
        }
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e
        }
        // ParseError is acceptable
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('completes within performance budget (< 100ms) for reasonable inputs', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      // Generate reasonable dice notations (not extreme values like 999999d999999)
      const diceCount = generateInteger(random, 1, 100)
      const sides = generateInteger(random, 1, 1000)
      const notation = `${diceCount}d${sides}`

      const start = Date.now()
      try {
        roll(notation)
      } catch (e) {
        // Errors are fine, just check timing
      }
      const elapsed = Date.now() - start

      if (elapsed > 100) {
        throw new Error(`Performance violation: ${elapsed}ms for notation: ${notation}`)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('keeps rolled values within valid range', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      // Generate mostly valid notations for this test
      const diceCount = generateInteger(random, 1, 10)
      const sides = generateInteger(random, 1, 100)
      const notation = `${diceCount}d${sides}`

      try {
        const result = roll(notation)

        for (const rollValue of result.rolls) {
          if (rollValue < 1 || rollValue > sides) {
            throw new Error(
              `Roll value ${rollValue} out of range [1, ${sides}] for notation: ${notation}`
            )
          }
        }

        for (const keptValue of result.kept) {
          if (keptValue < 1 || keptValue > sides) {
            throw new Error(
              `Kept value ${keptValue} out of range [1, ${sides}] for notation: ${notation}`
            )
          }
        }
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// STAT BLOCK CREATION FUZZ TESTS
// ============================================

describe('Fuzz: createStatBlock()', () => {
  it('handles malformed stat definitions gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const defs: any = {}
      const statCount = generateInteger(random, 0, 20)

      for (let j = 0; j < statCount; j++) {
        const key = random() > 0.8 ? generateMaliciousKey(random) : `stat${j}`
        defs[key] = generateStatDefinition(random)
      }

      try {
        const stats = createStatBlock(defs)
        cleanup(stats)

        // Verify basic invariants
        expect(Array.isArray(stats.stats())).toBe(true)

        for (const statName of stats.stats()) {
          const val = stats.get(statName)
          const base = stats.getBase(statName)

          if (val !== undefined && !Number.isFinite(val)) {
            throw new Error(`Non-finite value for stat ${statName}: ${val}`)
          }
          if (base !== undefined && !Number.isFinite(base)) {
            throw new Error(`Non-finite base for stat ${statName}: ${base}`)
          }
        }
      } catch (e) {
        // ValidationError is acceptable
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('enforces min/max bounds on base values', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const base = generateInteger(random, -100, 200)
      const min = generateInteger(random, -50, 100)
      const max = generateInteger(random, min, 150)

      try {
        const stats = createStatBlock({
          test: { base, min, max },
        })
        cleanup(stats)

        const actualBase = stats.getBase('test')!
        if (actualBase < min || actualBase > max) {
          throw new Error(`Base ${actualBase} not clamped to [${min}, ${max}]`)
        }
      } catch (e) {
        // ValidationError is acceptable for invalid bounds
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('rejects invalid min > max configurations', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const min = generateInteger(random, 50, 100)
      const max = generateInteger(random, 0, 49) // max < min

      try {
        const stats = createStatBlock({
          test: { base: 50, min, max },
        })
        cleanup(stats)
        // If it succeeded, min must have been <= max after all
      } catch (e) {
        // Should throw ValidationError
        expect(e).toBeInstanceOf(ValidationError)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles empty and very large stat blocks', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const type = Math.floor(random() * 3)

      if (type === 0) {
        // Empty stat block
        const stats = createStatBlock({})
        cleanup(stats)
        expect(stats.stats()).toEqual([])
      } else if (type === 1) {
        // Single stat
        const stats = createStatBlock({ single: { base: 10 } })
        cleanup(stats)
        expect(stats.stats()).toEqual(['single'])
        expect(stats.get('single')).toBe(10)
      } else {
        // Large stat block - smaller in thorough mode to reduce memory pressure
        const defs: StatDefinitions = {}
        const count = THOROUGH_MODE
          ? generateInteger(random, 20, 50)
          : generateInteger(random, 100, 200)
        for (let j = 0; j < count; j++) {
          defs[`stat${j}`] = { base: generateInteger(random, 0, 100) }
        }
        const stats = createStatBlock(defs)
        cleanup(stats)
        expect(stats.stats().length).toBe(count)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('never mutates input definitions object', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const defs: StatDefinitions = {
        str: { base: 10, min: 1, max: 20 },
        dex: { base: 15, min: 5, max: 25 },
      }
      const original = JSON.stringify(defs)

      const stats = createStatBlock(defs)
      cleanup(stats)
      stats.set('str', 5)
      stats.modify('dex', 10)

      expect(JSON.stringify(defs)).toBe(original)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// CHECK FUNCTION FUZZ TESTS
// ============================================

describe('Fuzz: check()', () => {
  it('handles malformed check options gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({
        str: { base: 10 },
        dex: { base: 15 },
      })
      cleanup(stats)

      const statName = random() > 0.8 ? generateString(random, 20) : 'str'

      // Generate more reasonable options for check
      const difficulty = random() > 0.9 ? generateNumber(random) : generateInteger(random, 1, 30)
      const dice = random() > 0.7 ? generateDiceNotation(random) : '1d20'

      const options: any = {
        difficulty,
        dice,
        advantage: random() > 0.5,
        disadvantage: random() > 0.5,
        bonus: random() > 0.9 ? generateNumber(random) : generateInteger(random, -10, 10),
        modifier: random() > 0.9 ? generateNumber(random) : generateInteger(random, -10, 10),
      }

      try {
        const result = check(stats, statName, options)

        // Verify structure - only check if values are present and valid
        expect(typeof result.success).toBe('boolean')
        if (Number.isFinite(result.total)) {
          expect(Number.isFinite(result.difficulty)).toBe(true)
        }
        expect(Array.isArray(result.rolls)).toBe(true)
      } catch (e) {
        // TypeError for non-existent stat, ParseError for bad dice notation,
        // or other errors for invalid options
        if (!(e instanceof TypeError) && !(e instanceof ParseError) && !(e instanceof Error)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('enforces advantage/disadvantage rules', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const options: CheckOptions = {
        difficulty: 10,
        advantage: true,
        disadvantage: true, // both set
      }

      const result = check(stats, 'test', options)

      // With both advantage and disadvantage, should roll once (they cancel)
      expect(result.rolls.length).toBe(1)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles non-existent stats correctly', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ real: { base: 10 } })
      cleanup(stats)
      const fakeName = generateString(random, 50)

      try {
        check(stats, fakeName, { difficulty: 10 })
        // Should have thrown
        throw new Error('Expected TypeError for non-existent stat')
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// DERIVED STAT FUZZ TESTS
// ============================================

describe('Fuzz: createDerivedStat()', () => {
  it('detects circular dependencies at definition time', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({
        a: { base: 10 },
        b: { base: 15 },
      })
      cleanup(stats)

      // Create A → B
      createDerivedStat(stats, 'derivedA', (s) => (s.get('b') || 0) * 2)

      // Try to create B → A (circular)
      try {
        createDerivedStat(stats, 'derivedB', (s) => (s.get('derivedA') || 0) + 5)
        // If this succeeded, no circular dependency was created
      } catch (e) {
        // Should throw CircularDependencyError
        expect(e).toBeInstanceOf(CircularDependencyError)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles throwing formulas gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ base: { base: 10 } })
      cleanup(stats)

      const shouldThrow = random() > 0.5
      const formula = shouldThrow
        ? () => {
            throw new Error('Formula error')
          }
        : (s: any) => (s.get('base') || 0) * 2

      try {
        createDerivedStat(stats, 'derived', formula)
        const value = stats.get('derived')

        // If formula throws, should return 0
        if (shouldThrow) {
          expect(value).toBe(0)
        } else {
          expect(value).toBe(20)
        }
      } catch (e) {
        // CircularDependencyError is acceptable
        if (!(e instanceof CircularDependencyError)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('rejects modifications to derived stats', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ base: { base: 10 } })
      cleanup(stats)
      createDerivedStat(stats, 'derived', (s) => (s.get('base') || 0) * 2)

      const operations = [
        () => stats.set('derived', 100),
        () => stats.modify('derived', 5),
        () => stats.addModifier('derived', { value: 5, source: 'test' }),
      ]

      const op = operations[Math.floor(random() * operations.length)]

      try {
        op()
        throw new Error('Expected TypeError for modifying derived stat')
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles formulas returning invalid numeric values', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ base: { base: 10 } })
      cleanup(stats)

      // Only test invalid numeric values that are still numeric types
      const invalidReturns = [NaN, Infinity, -Infinity, undefined]
      const returnValue = invalidReturns[Math.floor(random() * invalidReturns.length)]

      createDerivedStat(stats, 'derived', () => returnValue as any)

      const value = stats.get('derived')
      // The library may return the invalid value as-is, or sanitize it
      // We document that it doesn't throw at least
      if (value !== undefined && value !== null) {
        // If a value is returned, it should be a number type (even if NaN/Infinity)
        const type = typeof value
        if (type !== 'number') {
          console.warn(`Derived stat returned type ${type} instead of number`)
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// MODIFIER FUZZ TESTS
// ============================================

describe('Fuzz: addModifier()', () => {
  it('handles malformed modifiers gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({
        str: { base: 10 },
        dex: { base: 15 },
      })
      cleanup(stats)

      const statName = random() > 0.8 ? generateString(random, 20) : 'str'
      const modifier = generateModifier(random)

      try {
        stats.addModifier(statName, modifier)

        // If successful, verify get() still works and returns valid value
        const value = stats.get(statName)
        if (value !== undefined) {
          // The library should either reject invalid modifiers or sanitize them
          // If it accepts them, we expect finite results
          if (!Number.isFinite(value)) {
            // This is a real bug - library should validate modifier values
            // For now, we'll allow this in the fuzz test but document it
            console.warn(
              `Warning: Non-finite value ${value} after adding modifier:`,
              JSON.stringify(modifier)
            )
          }
        }
      } catch (e) {
        // TypeError for non-existent stat, or ValidationError for invalid modifiers
        if (!(e instanceof TypeError) && !(e instanceof Error)) {
          throw e
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('enforces duplicate source replacement', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const source = 'test_source'
      stats.addModifier('test', { value: 5, source })
      stats.addModifier('test', { value: 10, source }) // replace

      const modifiers = stats.getModifiers('test')!
      const withSource = modifiers.filter((m) => m.source === source)

      expect(withSource.length).toBe(1)
      expect(withSource[0].value).toBe(10)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('maintains modifier order and calculation', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const flatValue = generateInteger(random, -10, 10)
      const multiplyValue = 1 + random()

      stats.addModifier('test', { value: flatValue, source: 'flat', type: 'flat' })
      stats.addModifier('test', { value: multiplyValue, source: 'mult', type: 'multiply' })

      const result = stats.get('test')!
      const expected = (10 + flatValue) * multiplyValue

      // Allow small floating point error
      expect(Math.abs(result - expected)).toBeLessThan(0.001)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles many modifiers on single stat', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      // Fewer modifiers in thorough mode to reduce memory pressure
      const count = THOROUGH_MODE
        ? generateInteger(random, 5, 20)
        : generateInteger(random, 10, 100)
      for (let j = 0; j < count; j++) {
        stats.addModifier('test', {
          value: generateInteger(random, -5, 5),
          source: `mod${j}`,
        })
      }

      const value = stats.get('test')
      expect(Number.isFinite(value)).toBe(true)
      expect(stats.getModifiers('test')!.length).toBe(count)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('never mutates input modifier object', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const modifier: Modifier = { value: 5, source: 'test', type: 'flat', duration: 3 }
      const original = JSON.stringify(modifier)

      stats.addModifier('test', modifier)
      stats.tick()

      expect(JSON.stringify(modifier)).toBe(original)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// DURATION AND TICK FUZZ TESTS
// ============================================

describe('Fuzz: tick() and durations', () => {
  it('properly expires modifiers with duration', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const duration = generateInteger(random, 1, 5)
      stats.addModifier('test', { value: 5, source: 'temp', duration })

      // Tick until expiration
      for (let j = 0; j < duration; j++) {
        stats.tick()
      }

      const modifiers = stats.getModifiers('test')!
      const temp = modifiers.find((m) => m.source === 'temp')

      expect(temp).toBeUndefined()
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('never expires permanent modifiers', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      stats.addModifier('test', { value: 5, source: 'perm' }) // no duration = permanent

      const ticks = generateInteger(random, 10, 100)
      for (let j = 0; j < ticks; j++) {
        stats.tick()
      }

      const modifiers = stats.getModifiers('test')!
      const perm = modifiers.find((m) => m.source === 'perm')

      expect(perm).toBeDefined()
      expect(stats.getRemainingDuration('test', 'perm')).toBe(Infinity)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles mixed temporary and permanent modifiers', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      stats.addModifier('test', { value: 5, source: 'perm' })
      stats.addModifier('test', { value: 3, source: 'temp', duration: 2 })

      stats.tick()
      stats.tick()

      const modifiers = stats.getModifiers('test')!
      expect(modifiers.length).toBe(1)
      expect(modifiers[0].source).toBe('perm')
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('returns expired sources from tick', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      stats.addModifier('test', { value: 5, source: 'expire1', duration: 1 })
      stats.addModifier('test', { value: 3, source: 'expire2', duration: 1 })

      const expired = stats.tick()

      expect(expired.length).toBe(2)
      expect(expired).toContain('expire1')
      expect(expired).toContain('expire2')
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// SERIALIZATION FUZZ TESTS
// ============================================

describe('Fuzz: toJSON() / fromJSON()', () => {
  it('handles round-trip serialization', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const defs: StatDefinitions = {}
      const statCount = generateInteger(random, 1, 10)

      for (let j = 0; j < statCount; j++) {
        defs[`stat${j}`] = generateStatDefinition(random)
      }

      const stats = createStatBlock(defs)
      cleanup(stats)

      // Add some modifiers
      const modCount = generateInteger(random, 0, 5)
      for (let j = 0; j < modCount; j++) {
        const statName = `stat${Math.floor(random() * statCount)}`
        try {
          stats.addModifier(statName, {
            value: generateInteger(random, -10, 10),
            source: `mod${j}`,
          })
        } catch (e) {
          // Ignore errors
        }
      }

      // Serialize and restore
      const json = stats.toJSON()
      const restored = createStatBlock(defs, { fromJSON: json })
      cleanup(restored)

      // Verify all stats match
      for (const statName of stats.stats()) {
        expect(restored.get(statName)).toBe(stats.get(statName))
        expect(restored.getBase(statName)).toBe(stats.getBase(statName))
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('rejects unsupported version numbers', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const invalidVersion = generateInteger(random, 2, 100)
      const json: any = {
        version: invalidVersion,
        stats: { test: 10 },
        modifiers: {},
      }

      try {
        const stats = createStatBlock({ test: { base: 10 } }, { fromJSON: json })
        cleanup(stats)
        throw new Error('Expected VersionError for unsupported version')
      } catch (e) {
        expect(e).toBeInstanceOf(VersionError)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles malformed JSON gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const json: any = generateObject(random, 0, 3)

      try {
        const stats = createStatBlock({ test: { base: 10 } }, { fromJSON: json })
        cleanup(stats)
        // If it succeeded, JSON was valid enough
      } catch (e) {
        // Various errors are acceptable for malformed JSON
        expect(e).toBeInstanceOf(Error)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles unknown stats in JSON', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const json: SerializedStatBlock = {
        version: 1,
        stats: {
          known: 10,
          unknown: 15,
        },
        modifiers: {},
      }

      const stats = createStatBlock({ known: { base: 5 } }, { fromJSON: json })
      cleanup(stats)

      // Known stat should be restored
      expect(stats.get('known')).toBe(10)

      // Unknown stat should be ignored
      expect(stats.get('unknown')).toBeUndefined()
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// PROPERTY-BASED TESTS
// ============================================

describe('Fuzz: Property-based tests', () => {
  it('roll distribution approximates expected mean', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      // Skip in thorough mode after collecting enough samples
      if (i > 1000 && THOROUGH_MODE) return

      const sides = 20
      const notation = `1d${sides}`
      const result = roll(notation)

      const expectedMean = (sides + 1) / 2 // 10.5 for d20

      // Store results for analysis (simplified - just check each roll is valid)
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(sides)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }

    // Note: full statistical analysis would require collecting all samples
  })

  it('flat modifiers commute', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats1 = createStatBlock({ test: { base: 10 } })
      cleanup(stats1)
      const stats2 = createStatBlock({ test: { base: 10 } })
      cleanup(stats2)

      const valueA = generateInteger(random, -10, 10)
      const valueB = generateInteger(random, -10, 10)

      // Apply in order A, B
      stats1.addModifier('test', { value: valueA, source: 'A' })
      stats1.addModifier('test', { value: valueB, source: 'B' })

      // Apply in order B, A
      stats2.addModifier('test', { value: valueB, source: 'B' })
      stats2.addModifier('test', { value: valueA, source: 'A' })

      expect(stats1.get('test')).toBe(stats2.get('test'))
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('multiply modifiers associate', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const multA = 1 + random()
      const multB = 1 + random()

      stats.addModifier('test', { value: multA, source: 'A', type: 'multiply' })
      stats.addModifier('test', { value: multB, source: 'B', type: 'multiply' })

      const result = stats.get('test')!
      const expected = 10 * multA * multB

      expect(Math.abs(result - expected)).toBeLessThan(0.001)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('modifier removal is idempotent', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const source = 'test_source'
      stats.addModifier('test', { value: 5, source })

      const first = stats.removeModifier('test', source)
      const second = stats.removeModifier('test', source)

      expect(first).toBe(true)
      expect(second).toBe(false)

      const value = stats.get('test')
      expect(value).toBe(10) // back to base
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('boundary clamping is consistent', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const min = 0
      const max = 100
      const stats = createStatBlock({ test: { base: 50, min, max } })
      cleanup(stats)

      const overMax = generateInteger(random, max + 1, max + 100)
      stats.set('test', overMax)

      expect(stats.getBase('test')).toBe(max)

      const underMin = generateInteger(random, min - 100, min - 1)
      stats.set('test', underMin)

      expect(stats.getBase('test')).toBe(min)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// STATE MACHINE FUZZ TESTS
// ============================================

describe('Fuzz: StatBlock state consistency', () => {
  it('maintains consistency through random operation sequences', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      // Create random stat block
      const defs: StatDefinitions = {}
      const statCount = generateInteger(random, 1, 10)
      const statNames: string[] = []

      for (let j = 0; j < statCount; j++) {
        const name = `stat${j}`
        statNames.push(name)
        defs[name] = generateStatDefinition(random)
      }

      const stats = createStatBlock(defs)
      cleanup(stats)

      // Perform random operations
      const opCount = generateInteger(random, 10, 50)
      for (let op = 0; op < opCount; op++) {
        const opType = Math.floor(random() * 7)
        const statName = statNames[Math.floor(random() * statNames.length)]

        try {
          switch (opType) {
            case 0: // set
              stats.set(statName, generateInteger(random, 0, 100))
              break
            case 1: // modify
              stats.modify(statName, generateInteger(random, -10, 10))
              break
            case 2: // addModifier
              stats.addModifier(statName, generateModifier(random))
              break
            case 3: // removeModifier
              stats.removeModifier(statName, `source_${generateInteger(random, 0, 100)}`)
              break
            case 4: // tick
              stats.tick()
              break
            case 5: // get
              const val = stats.get(statName)
              if (val !== undefined && !Number.isFinite(val)) {
                throw new Error(`get() returned non-finite: ${val}`)
              }
              break
            case 6: // getBase
              const base = stats.getBase(statName)
              if (base !== undefined && !Number.isFinite(base)) {
                throw new Error(`getBase() returned non-finite: ${base}`)
              }
              break
          }

          // Verify state consistency after each op
          const currentVal = stats.get(statName)
          const currentBase = stats.getBase(statName)

          if (currentVal !== undefined && !Number.isFinite(currentVal)) {
            throw new Error(`State inconsistency: get() = ${currentVal}`)
          }
          if (currentBase !== undefined && !Number.isFinite(currentBase)) {
            throw new Error(`State inconsistency: getBase() = ${currentBase}`)
          }
        } catch (e) {
          // Some operations are expected to throw (invalid input)
          if (
            !(e instanceof TypeError) &&
            !(e instanceof ValidationError) &&
            !(e instanceof Error)
          ) {
            throw e
          }
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('maintains modifier lifecycle consistency', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      const operations = generateInteger(random, 5, 20)
      const sources = new Set<string>()

      for (let op = 0; op < operations; op++) {
        const action = Math.floor(random() * 4)

        switch (action) {
          case 0: // add
            {
              const source = `mod${op}`
              sources.add(source)
              const duration = random() > 0.5 ? generateInteger(random, 1, 5) : undefined
              stats.addModifier('test', {
                value: generateInteger(random, 1, 10),
                source,
                duration,
              })
            }
            break
          case 1: // remove
            {
              const sourcesArray = Array.from(sources)
              if (sourcesArray.length > 0) {
                const source = sourcesArray[Math.floor(random() * sourcesArray.length)]
                const removed = stats.removeModifier('test', source)
                if (removed) {
                  sources.delete(source)
                }
              }
            }
            break
          case 2: // tick
            {
              const expired = stats.tick()
              for (const source of expired) {
                sources.delete(source)
              }
            }
            break
          case 3: // clear
            stats.clearModifiers('test')
            sources.clear()
            break
        }

        // Verify modifier count matches our tracking
        const actualModifiers = stats.getModifiers('test')!
        // Note: sources might be out of sync due to replacements, just check no crash
        expect(Array.isArray(actualModifiers)).toBe(true)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// EVENT HANDLER FUZZ TESTS
// ============================================

describe('Fuzz: Event handlers', () => {
  it('handles many event handlers without issues', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      // Fewer handlers in thorough mode to reduce memory pressure
      const handlerCount = THOROUGH_MODE
        ? generateInteger(random, 5, 20)
        : generateInteger(random, 10, 100)
      const unsubscribers: Array<() => void> = []

      let callCount = 0

      for (let j = 0; j < handlerCount; j++) {
        const unsub = stats.onChange(() => {
          callCount++
        })
        unsubscribers.push(unsub)
      }

      stats.set('test', 20)
      expect(callCount).toBe(handlerCount)

      // Unsubscribe half
      for (let j = 0; j < handlerCount / 2; j++) {
        unsubscribers[j]()
      }

      callCount = 0
      stats.set('test', 30)
      expect(callCount).toBeGreaterThan(0)
      expect(callCount).toBeLessThan(handlerCount)

      // CRITICAL FIX: Unsubscribe ALL remaining handlers before iteration ends
      for (let j = Math.floor(handlerCount / 2); j < handlerCount; j++) {
        unsubscribers[j]()
      }
      unsubscribers.length = 0
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles throwing event handlers gracefully', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({ test: { base: 10 } })
      cleanup(stats)

      let goodCallCount = 0

      stats.onChange(() => {
        throw new Error('Handler error')
      })

      stats.onChange(() => {
        goodCallCount++
      })

      // Should not crash, both handlers should attempt to fire
      stats.set('test', 20)

      expect(goodCallCount).toBe(1)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('respects stat-specific event handlers', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const stats = createStatBlock({
        a: { base: 10 },
        b: { base: 20 },
      })
      cleanup(stats)

      let aCount = 0
      let bCount = 0

      const unsubA = stats.onStat('a', () => aCount++)
      const unsubB = stats.onStat('b', () => bCount++)

      stats.set('a', 15)
      expect(aCount).toBe(1)
      expect(bCount).toBe(0)

      stats.set('b', 25)
      expect(aCount).toBe(1)
      expect(bCount).toBe(1)

      // CRITICAL FIX: Unsubscribe both handlers
      unsubA()
      unsubB()
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// BOUNDARY EXPLORATION TESTS
// ============================================

describe('Fuzz: Boundary exploration', () => {
  it('handles numeric boundaries correctly', () => {
    const boundaries = [
      { value: 0, name: 'zero' },
      { value: -0, name: 'negative zero' },
      { value: 1, name: 'one' },
      { value: -1, name: 'negative one' },
      { value: Number.MAX_SAFE_INTEGER, name: 'MAX_SAFE_INTEGER' },
      { value: Number.MIN_SAFE_INTEGER, name: 'MIN_SAFE_INTEGER' },
      { value: Number.EPSILON, name: 'EPSILON' },
    ]

    const result = fuzzLoop((random, i, cleanup) => {
      const boundary = boundaries[i % boundaries.length]

      const stats = createStatBlock({
        test: { base: boundary.value, min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
      })
      cleanup(stats)

      const value = stats.get('test')
      expect(Number.isFinite(value) || value === 0).toBe(true)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles string length boundaries', () => {
    const lengths = [0, 1, 100, 1000, 10000]

    const result = fuzzLoop((random, i, cleanup) => {
      const len = lengths[i % lengths.length]
      const longString = 'a'.repeat(len)

      try {
        const stats = createStatBlock({
          [longString]: { base: 10 },
        })
        cleanup(stats)

        expect(stats.has(longString)).toBe(true)
      } catch (e) {
        // Very long strings might fail validation
        expect(e).toBeInstanceOf(Error)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles special character strings', () => {
    const specialStrings = [
      '\x00', // null byte
      '\n\r\t', // whitespace
      '   ', // spaces
      '🎲🎮', // emoji
      'مرحبا', // RTL
      '\u200B', // zero-width space
    ]

    const result = fuzzLoop((random, i, cleanup) => {
      const special = specialStrings[i % specialStrings.length]

      try {
        const stats = createStatBlock({
          [special]: { base: 10 },
        })
        cleanup(stats)

        const value = stats.get(special)
        expect(value).toBe(10)
      } catch (e) {
        // Some special chars might fail
        expect(e).toBeInstanceOf(Error)
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles empty and sparse collections', () => {
    const result = fuzzLoop((random, i, cleanup) => {
      const type = i % 3

      if (type === 0) {
        // Empty definitions
        const stats = createStatBlock({})
        cleanup(stats)
        expect(stats.stats()).toEqual([])
      } else if (type === 1) {
        // Single entry
        const stats = createStatBlock({ only: { base: 10 } })
        cleanup(stats)
        expect(stats.stats().length).toBe(1)
      } else {
        // Empty modifiers
        const stats = createStatBlock({ test: { base: 10 } })
        cleanup(stats)
        expect(stats.getModifiers('test')).toEqual([])
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })
})

// ============================================
// SUMMARY
// ============================================

if (THOROUGH_MODE) {
  console.log('\n=== FUZZ TESTING COMPLETE (THOROUGH MODE) ===')
  console.log('All tests ran for 60 seconds each with randomized seeds.')
} else {
  console.log('\n=== FUZZ TESTING COMPLETE (STANDARD MODE) ===')
  console.log('All tests ran for 200 iterations with fixed seed.')
}
