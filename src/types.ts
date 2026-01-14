// Type definitions for @motioneffector/stats

export type StatDefinition = {
  base: number
  min?: number
  max?: number
}

export type StatDefinitions = Record<string, StatDefinition>

export type Modifier = {
  value: number
  source: string
  type?: 'flat' | 'multiply'
  duration?: 'permanent' | 'temporary' | number
}

export type ModifierInfo = {
  value: number
  source: string
  type: 'flat' | 'multiply'
  duration: 'permanent' | number
}

export type RollResult = {
  total: number
  rolls: number[]
  kept: number[]
  notation: string
  modifier: number
}

export type CheckResult = {
  success: boolean
  roll: number
  rolls: number[]
  modifier: number
  bonus: number
  total: number
  difficulty: number
  margin: number
}

export type CheckOptions = {
  difficulty: number
  dice?: string
  advantage?: boolean
  disadvantage?: boolean
  bonus?: number
  modifier?: number
}

export type HistoryEntry = {
  notation: string
  result: number
  rolls: number[]
  timestamp: number
  stat?: string
  context?: string
}

export type ContestResult = {
  winner: 'a' | 'b' | 'tie'
  rolls: { a: number; b: number }
  totals: { a: number; b: number }
  margin: number
}

export type StatChangeEvent = {
  stat: string
  newValue: number
  oldValue: number
  baseChanged: boolean
  modifiersChanged: boolean
}

export type StatBlockOptions = {
  historyLimit?: number
  modifierFormula?: (value: number) => number
}

export type StatBlock = {
  get(statName: string): number | undefined
  getBase(statName: string): number | undefined
  set(statName: string, value: number): number
  modify(statName: string, delta: number): number
  has(statName: string): boolean
  stats(): string[]
  addModifier(statName: string, modifier: Modifier): Modifier
  removeModifier(statName: string, source: string): boolean
  getModifiers(statName: string): ModifierInfo[] | undefined
  clearModifiers(statName?: string): number
  getRemainingDuration(statName: string, source: string): number | undefined
  tick(): string[]
  getRollHistory(limit?: number): HistoryEntry[]
  clearRollHistory(): void
  onChange(callback: (event: StatChangeEvent) => void): () => void
  onStat(statName: string, callback: (event: StatChangeEvent) => void): () => void
  isDerived(name: string): boolean
  toJSON(): SerializedStatBlock
  dispose(): void
}

export type SerializedStatBlock = {
  version: 1
  stats: Record<string, number>
  modifiers: Record<
    string,
    Array<{
      value: number
      source: string
      type: 'flat' | 'multiply'
      duration: 'permanent' | number
    }>
  >
}

export type StatTemplateConfig = {
  stats: Record<
    string,
    {
      default: number
      min?: number
      max?: number
    }
  >
  options?: StatBlockOptions
}

export type StatTemplate = {
  create(overrides?: Record<string, number>): StatBlock
}

export type RollTableEntry<T> = {
  weight: number
  value: T
}

export type RollOptions = {
  context?: string
}

export type ContestOptions = {
  dice?: string
}
