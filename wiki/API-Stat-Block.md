# Stat Block API

Functions and methods for creating and managing stat blocks.

---

## `createStatBlock()`

Create a new stat block with the given definitions.

**Signature:**

```typescript
function createStatBlock(
  definitions: StatDefinitions,
  options?: StatBlockOptions & { fromJSON?: SerializedStatBlock }
): StatBlock
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `definitions` | `StatDefinitions` | Yes | Object mapping stat names to definitions |
| `options` | `StatBlockOptions` | No | Configuration options |
| `options.historyLimit` | `number` | No | Max roll history entries. Default: `100`. Set to `0` to disable. |
| `options.modifierFormula` | `(value: number) => number` | No | Custom formula for check modifiers |
| `options.fromJSON` | `SerializedStatBlock` | No | Restore from serialized data |

**Returns:** `StatBlock` — The created stat block

**Example:**

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  health: { base: 100, min: 0 }
})
```

**Throws:**

- `ValidationError` — When min > max in a stat definition

---

## StatBlock Methods

### `get()`

Get the effective value of a stat (base + modifiers).

**Signature:**

```typescript
get(statName: string): number | undefined
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statName` | `string` | Yes | Name of the stat |

**Returns:** `number | undefined` — The effective value, or `undefined` if stat doesn't exist

**Example:**

```typescript
hero.get('strength') // 16
hero.get('unknown')  // undefined
```

---

### `getBase()`

Get the base value of a stat (without modifiers).

**Signature:**

```typescript
getBase(statName: string): number | undefined
```

**Returns:** `number | undefined` — The base value

**Example:**

```typescript
hero.addModifier('strength', { value: 2, source: 'buff' })
hero.get('strength')     // 18
hero.getBase('strength') // 16
```

---

### `set()`

Set the base value of a stat.

**Signature:**

```typescript
set(statName: string, value: number): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statName` | `string` | Yes | Name of the stat |
| `value` | `number` | Yes | New base value |

**Returns:** `number` — The new base value (may be clamped to bounds)

**Throws:**

- `TypeError` — If stat doesn't exist or is derived

**Example:**

```typescript
hero.set('strength', 18) // Returns 18
hero.set('strength', 25) // Returns 20 (clamped to max)
```

---

### `modify()`

Add to or subtract from the base value.

**Signature:**

```typescript
modify(statName: string, delta: number): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statName` | `string` | Yes | Name of the stat |
| `delta` | `number` | Yes | Amount to add (negative to subtract) |

**Returns:** `number` — The new base value

**Throws:**

- `TypeError` — If stat doesn't exist or is derived

**Example:**

```typescript
hero.modify('health', -10) // Take 10 damage
hero.modify('health', 5)   // Heal 5
```

---

### `has()`

Check if a stat exists.

**Signature:**

```typescript
has(statName: string): boolean
```

**Example:**

```typescript
hero.has('strength') // true
hero.has('luck')     // false
```

---

### `stats()`

Get all stat names.

**Signature:**

```typescript
stats(): string[]
```

**Returns:** `string[]` — Array of stat names

**Example:**

```typescript
hero.stats() // ['strength', 'health']
```

---

### `addModifier()`

Add a modifier to a stat.

**Signature:**

```typescript
addModifier(statName: string, modifier: Modifier): Modifier
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statName` | `string` | Yes | Name of the stat |
| `modifier` | `Modifier` | Yes | The modifier to add |

**Returns:** `Modifier` — The added modifier

**Throws:**

- `TypeError` — If stat doesn't exist or is derived

**Example:**

```typescript
hero.addModifier('strength', {
  value: 2,
  source: 'belt-of-strength',
  type: 'flat',
  duration: 'permanent'
})
```

---

### `removeModifier()`

Remove a modifier by source name.

**Signature:**

```typescript
removeModifier(statName: string, source: string): boolean
```

**Returns:** `boolean` — `true` if removed, `false` if not found

**Example:**

```typescript
hero.removeModifier('strength', 'belt-of-strength')
```

---

### `getModifiers()`

Get all modifiers on a stat.

**Signature:**

```typescript
getModifiers(statName: string): ModifierInfo[] | undefined
```

**Returns:** `ModifierInfo[] | undefined` — Array of modifiers, or `undefined` if stat doesn't exist

**Example:**

```typescript
const mods = hero.getModifiers('strength')
// [{ value: 2, source: 'belt', type: 'flat', duration: 'permanent' }]
```

---

### `clearModifiers()`

Remove all modifiers from a stat or all stats.

**Signature:**

```typescript
clearModifiers(statName?: string): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statName` | `string` | No | Stat to clear. If omitted, clears all stats. |

**Returns:** `number` — Count of modifiers removed

**Example:**

```typescript
hero.clearModifiers('strength') // Clear one stat
hero.clearModifiers()           // Clear all stats
```

---

### `getRemainingDuration()`

Get remaining duration of a modifier.

**Signature:**

```typescript
getRemainingDuration(statName: string, source: string): number | undefined
```

**Returns:** `number | undefined` — Remaining ticks, `Infinity` for permanent, or `undefined` if not found

**Example:**

```typescript
hero.getRemainingDuration('strength', 'rage') // 3
```

---

### `tick()`

Advance time, decrementing modifier durations.

**Signature:**

```typescript
tick(): string[]
```

**Returns:** `string[]` — Sources of expired modifiers

**Example:**

```typescript
const expired = hero.tick()
console.log(expired) // ['rage', 'haste']
```

---

### `getRollHistory()`

Get roll history entries.

**Signature:**

```typescript
getRollHistory(limit?: number): HistoryEntry[]
```

**Returns:** `HistoryEntry[]` — Array of history entries

---

### `clearRollHistory()`

Clear all roll history.

**Signature:**

```typescript
clearRollHistory(): void
```

---

### `onChange()`

Subscribe to all stat changes.

**Signature:**

```typescript
onChange(callback: (event: StatChangeEvent) => void): () => void
```

**Returns:** `() => void` — Unsubscribe function

**Example:**

```typescript
const unsubscribe = hero.onChange((event) => {
  console.log(`${event.stat}: ${event.oldValue} → ${event.newValue}`)
})

// Later...
unsubscribe()
```

---

### `onStat()`

Subscribe to changes on a specific stat.

**Signature:**

```typescript
onStat(statName: string, callback: (event: StatChangeEvent) => void): () => void
```

**Throws:**

- `TypeError` — If stat doesn't exist

---

### `isDerived()`

Check if a stat is derived.

**Signature:**

```typescript
isDerived(name: string): boolean
```

---

### `toJSON()`

Serialize the stat block.

**Signature:**

```typescript
toJSON(): SerializedStatBlock
```

**Returns:** `SerializedStatBlock` — Serializable object

---

### `dispose()`

Clean up resources and listeners.

**Signature:**

```typescript
dispose(): void
```

---

## Types

### `StatDefinition`

```typescript
interface StatDefinition {
  base: number
  min?: number
  max?: number
}
```

### `StatDefinitions`

```typescript
type StatDefinitions = Record<string, StatDefinition>
```

### `Modifier`

```typescript
interface Modifier {
  value: number
  source: string
  type?: 'flat' | 'multiply'
  duration?: 'permanent' | 'temporary' | number
}
```

### `ModifierInfo`

```typescript
interface ModifierInfo {
  value: number
  source: string
  type: 'flat' | 'multiply'
  duration: 'permanent' | number
}
```

### `StatChangeEvent`

```typescript
interface StatChangeEvent {
  stat: string
  newValue: number
  oldValue: number
  baseChanged: boolean
  modifiersChanged: boolean
}
```

### `StatBlockOptions`

```typescript
interface StatBlockOptions {
  historyLimit?: number
  modifierFormula?: (value: number) => number
}
```

### `SerializedStatBlock`

```typescript
interface SerializedStatBlock {
  version: 1
  stats: Record<string, number>
  modifiers: Record<string, ModifierInfo[]>
}
```

---

## Related

- **[Stat Blocks](Concept-Stat-Blocks)** — Conceptual overview
- **[Modifiers](Concept-Modifiers)** — How modifiers work
- **[Working with Modifiers](Guide-Working-With-Modifiers)** — Practical guide
