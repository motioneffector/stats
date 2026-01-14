# Types

TypeScript type definitions exported by the library.

---

## Dice Types

### `RollResult`

Result from a dice roll.

```typescript
interface RollResult {
  total: number
  rolls: number[]
  kept: number[]
  notation: string
  modifier: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `total` | `number` | Final sum (kept dice + modifier) |
| `rolls` | `number[]` | All individual die results |
| `kept` | `number[]` | Dice that contributed to total |
| `notation` | `string` | Original notation string |
| `modifier` | `number` | Flat modifier from notation |

### `RollOptions`

Options for dice rolling.

```typescript
interface RollOptions {
  context?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `context` | `string` | Optional context for roll history |

---

## Stat Block Types

### `StatDefinition`

Definition for a single stat.

```typescript
interface StatDefinition {
  base: number
  min?: number
  max?: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `base` | `number` | Initial value |
| `min` | `number` | Minimum allowed value |
| `max` | `number` | Maximum allowed value |

### `StatDefinitions`

Map of stat names to definitions.

```typescript
type StatDefinitions = Record<string, StatDefinition>
```

### `StatBlock`

Interface for stat block instances.

```typescript
interface StatBlock {
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
```

### `StatBlockOptions`

Options for creating stat blocks.

```typescript
interface StatBlockOptions {
  historyLimit?: number
  modifierFormula?: (value: number) => number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `historyLimit` | `number` | Max roll history entries. Default: `100` |
| `modifierFormula` | `function` | Custom modifier calculation |

### `SerializedStatBlock`

Serialized stat block for persistence.

```typescript
interface SerializedStatBlock {
  version: 1
  stats: Record<string, number>
  modifiers: Record<string, Array<{
    value: number
    source: string
    type: 'flat' | 'multiply'
    duration: 'permanent' | number
  }>>
}
```

---

## Modifier Types

### `Modifier`

Input for adding a modifier.

```typescript
interface Modifier {
  value: number
  source: string
  type?: 'flat' | 'multiply'
  duration?: 'permanent' | 'temporary' | number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `value` | `number` | Modifier value |
| `source` | `string` | Unique identifier |
| `type` | `'flat' \| 'multiply'` | How to apply. Default: `'flat'` |
| `duration` | `'permanent' \| 'temporary' \| number` | How long it lasts |

### `ModifierInfo`

Information about an active modifier.

```typescript
interface ModifierInfo {
  value: number
  source: string
  type: 'flat' | 'multiply'
  duration: 'permanent' | number
}
```

---

## Event Types

### `StatChangeEvent`

Event fired when a stat changes.

```typescript
interface StatChangeEvent {
  stat: string
  newValue: number
  oldValue: number
  baseChanged: boolean
  modifiersChanged: boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `stat` | `string` | Name of the changed stat |
| `newValue` | `number` | New effective value |
| `oldValue` | `number` | Previous effective value |
| `baseChanged` | `boolean` | Whether base value changed |
| `modifiersChanged` | `boolean` | Whether modifiers changed |

### `HistoryEntry`

Entry in roll history.

```typescript
interface HistoryEntry {
  notation: string
  result: number
  rolls: number[]
  timestamp: number
  stat?: string
  context?: string
}
```

---

## Check Types

### `CheckOptions`

Options for skill checks.

```typescript
interface CheckOptions {
  difficulty: number
  dice?: string
  advantage?: boolean
  disadvantage?: boolean
  bonus?: number
  modifier?: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `difficulty` | `number` | Target DC |
| `dice` | `string` | Dice notation. Default: `'1d20'` |
| `advantage` | `boolean` | Roll twice, take higher |
| `disadvantage` | `boolean` | Roll twice, take lower |
| `bonus` | `number` | Additional bonus |
| `modifier` | `number` | Override calculated modifier |

### `CheckResult`

Result from a skill check.

```typescript
interface CheckResult {
  success: boolean
  roll: number
  rolls: number[]
  modifier: number
  bonus: number
  total: number
  difficulty: number
  margin: number
}
```

### `ContestOptions`

Options for contests.

```typescript
interface ContestOptions {
  dice?: string
}
```

### `ContestResult`

Result from an opposed contest.

```typescript
interface ContestResult {
  winner: 'a' | 'b' | 'tie'
  rolls: { a: number; b: number }
  totals: { a: number; b: number }
  margin: number
}
```

---

## Template Types

### `StatTemplateConfig`

Configuration for stat templates.

```typescript
interface StatTemplateConfig {
  stats: Record<string, {
    default: number
    min?: number
    max?: number
  }>
  options?: StatBlockOptions
}
```

### `StatTemplate`

Template for creating stat blocks.

```typescript
interface StatTemplate {
  create(overrides?: Record<string, number>): StatBlock
}
```

---

## Utility Types

### `RollTableEntry<T>`

Entry in a weighted random table.

```typescript
interface RollTableEntry<T> {
  weight: number
  value: T
}
```

| Property | Type | Description |
|----------|------|-------------|
| `weight` | `number` | Relative probability |
| `value` | `T` | Value returned if selected |
