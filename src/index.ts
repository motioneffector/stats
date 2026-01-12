/**
 * @motioneffector/stats - RPG stat management library
 *
 * A TypeScript library for managing character stats, dice rolling, and checks
 * in tabletop RPG systems.
 *
 * @module @motioneffector/stats
 */

// Core exports
export { roll } from './core/dice'
export { createStatBlock } from './core/stat-block'
export { check, createDerivedStat, saveThrow, contest, rollTable } from './core/checks-and-utils'
export { createStatTemplate } from './core/stat-template'

// Error exports
export { ParseError, ValidationError, CircularDependencyError, VersionError } from './errors'

// Type exports
export type {
  // Dice types
  RollResult,
  RollOptions,
  // Stat block types
  StatDefinitions,
  StatBlock,
  StatBlockOptions,
  Modifier,
  ModifierInfo,
  HistoryEntry,
  StatChangeEvent,
  SerializedStatBlock,
  // Check types
  CheckOptions,
  CheckResult,
  ContestOptions,
  ContestResult,
  // Utility types
  RollTableEntry,
  // Template types
  StatTemplate,
  StatTemplateConfig,
} from './types'
