# @motioneffector/stats

A comprehensive TypeScript library for RPG-style statistics, dice rolling, and stat checks. Perfect for tabletop RPG tools, roguelikes, and any game requiring D&D 5e-style mechanics.

[![npm version](https://img.shields.io/npm/v/@motioneffector/stats.svg)](https://www.npmjs.com/package/@motioneffector/stats)
[![license](https://img.shields.io/npm/l/@motioneffector/stats.svg)](https://github.com/motioneffector/stats/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Installation

```bash
npm install @motioneffector/stats
```

## Quick Start

```typescript
import { createStatBlock, roll, check } from '@motioneffector/stats'

// Create a character with stats
const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})

// Roll dice
const damage = roll('2d6+3')  // { total: 11, rolls: [4, 4], modifier: 3 }

// Make a strength check
const result = check(hero, 'strength', { difficulty: 15 })
// { success: true, roll: 14, modifier: 3, total: 17, difficulty: 15 }
```

## Features

- **🎲 Dice Rolling** - Full dice notation parser supporting d20, modifiers, advantage, keep/drop, exploding dice, and rerolls
- **📊 Stat Management** - Define stats with bounds, modifiers (flat/multiply), and automatic calculations
- **✅ Stat Checks** - D&D 5e-style checks with advantage/disadvantage, custom dice, and bonuses
- **🔄 Derived Stats** - Computed stats that auto-update when dependencies change
- **⏱️ Duration System** - Temporary and permanent modifiers with automatic expiration
- **📝 Roll History** - Track all rolls for audit trails and combat logs
- **💾 Serialization** - Save and load stat blocks with full state preservation
- **📦 Zero Dependencies** - Lightweight and tree-shakeable
- **🔒 Full TypeScript** - Complete type definitions with strict mode support

## Demo

Try the [interactive demo](https://motioneffector.github.io/stats/) in your browser.

## API Reference

### Dice Rolling

#### `roll(notation: string): RollResult`

Parse and execute dice notation with support for modifiers, keep/drop, exploding, and rerolls.

```typescript
import { roll } from '@motioneffector/stats'

// Basic rolling
roll('1d20')        // { total: 15, rolls: [15], kept: [15], notation: '1d20', modifier: 0 }
roll('2d6+3')       // { total: 11, rolls: [4, 4], kept: [4, 4], notation: '2d6+3', modifier: 3 }

// Keep/drop mechanics
roll('4d6kh3')      // Roll 4d6, keep highest 3 (D&D stat rolling)
roll('2d20kh1')     // Advantage: roll 2d20, keep highest
roll('2d20kl1')     // Disadvantage: roll 2d20, keep lowest

// Advanced mechanics
roll('1d6!')        // Exploding dice: reroll and add on max value
roll('1d6r1')       // Reroll ones
roll('1d6r<3')      // Reroll values less than 3
```

**Returns:** `RollResult`
- `total: number` - Final sum after modifiers
- `rolls: number[]` - All individual die results (including explosions)
- `kept: number[]` - Dice kept after keep/drop operations
- `notation: string` - Original notation string
- `modifier: number` - Sum of numeric modifiers

**Throws:** `ParseError` for invalid notation

### Stat Blocks

#### `createStatBlock(definitions: StatDefinitions, options?: StatBlockOptions): StatBlock`

Create a stat block with base values, optional bounds, and modifiers.

```typescript
import { createStatBlock } from '@motioneffector/stats'

const character = createStatBlock({
  strength: { base: 14, min: 1, max: 20 },
  dexterity: { base: 12, min: 1, max: 20 },
  health: { base: 50, min: 0, max: 100 },
  armor: { base: 5, min: 0 }  // No max
}, {
  historyLimit: 100,  // Roll history size (default: 100)
  modifierFormula: (value) => Math.floor((value - 10) / 2)  // D&D 5e formula
})
```

**StatBlock Methods:**

##### `get(statName: string): number | undefined`

Get effective value (base + all modifiers).

```typescript
character.get('strength')  // 14
```

##### `getBase(statName: string): number | undefined`

Get base value ignoring modifiers.

```typescript
character.getBase('strength')  // 14
```

##### `set(statName: string, value: number): number`

Set base value (clamped to min/max bounds).

```typescript
character.set('health', 30)  // Returns: 30
```

##### `modify(statName: string, delta: number): number`

Adjust base value by delta (clamped to bounds).

```typescript
character.modify('health', -10)  // Reduce health by 10
```

##### `addModifier(statName: string, modifier: Modifier): Modifier`

Add a temporary or permanent modifier.

```typescript
// Temporary buff (expires in 3 ticks)
character.addModifier('strength', {
  value: 2,
  source: 'rage_spell',
  duration: 3
})

// Permanent equipment bonus
character.addModifier('armor', {
  value: 3,
  source: 'leather_armor',
  duration: 'permanent'
})

// Multiply modifier
character.addModifier('damage', {
  value: 1.5,
  type: 'multiply',
  source: 'critical_hit',
  duration: 'temporary'
})
```

**Modifier type:**
- `value: number` - Bonus/penalty amount
- `source: string` - Unique identifier for removal
- `type?: 'flat' | 'multiply'` - How modifier applies (default: 'flat')
- `duration?: 'permanent' | 'temporary' | number` - When it expires (default: 'permanent')

**Order of operations:** `(base + flat_mods) * mult_1 * mult_2 * ...`

##### `removeModifier(statName: string, source: string): boolean`

Remove modifier by source identifier.

```typescript
character.removeModifier('strength', 'rage_spell')  // Returns: true if removed
```

##### `getModifiers(statName: string): ModifierInfo[] | undefined`

Get all active modifiers for a stat.

```typescript
character.getModifiers('strength')
// [{ value: 2, source: 'rage_spell', type: 'flat', duration: 2 }]
```

##### `clearModifiers(statName?: string): number`

Remove all modifiers (or just for one stat). Returns count removed.

```typescript
character.clearModifiers()            // Clear all modifiers
character.clearModifiers('strength')  // Clear only strength modifiers
```

##### `tick(): string[]`

Advance time by one tick, decrementing durations and removing expired modifiers. Returns array of expired sources.

```typescript
const expired = character.tick()  // ['rage_spell', 'haste']
```

##### `getRemainingDuration(statName: string, source: string): number | undefined`

Get remaining ticks for a modifier. Returns `Infinity` for permanent modifiers.

```typescript
character.getRemainingDuration('strength', 'rage_spell')  // 2
```

##### `has(statName: string): boolean`

Check if stat exists.

```typescript
character.has('strength')  // true
```

##### `stats(): string[]`

Get array of all stat names (including derived stats).

```typescript
character.stats()  // ['strength', 'dexterity', 'health', 'armor']
```

##### `onChange(callback: (event: StatChangeEvent) => void): () => void`

Subscribe to all stat changes. Returns unsubscribe function.

```typescript
const unsubscribe = character.onChange((event) => {
  console.log(`${event.stat} changed from ${event.oldValue} to ${event.newValue}`)
})

// Later...
unsubscribe()
```

##### `onStat(statName: string, callback: (event: StatChangeEvent) => void): () => void`

Subscribe to specific stat changes.

```typescript
character.onStat('health', (event) => {
  if (event.newValue <= 0) {
    console.log('Character died!')
  }
})
```

**Throws:** `TypeError` for non-existent stat

##### `getRollHistory(limit?: number): HistoryEntry[]`

Get roll history (most recent first).

```typescript
const history = character.getRollHistory(10)  // Last 10 rolls
```

##### `clearRollHistory(): void`

Clear all roll history.

```typescript
character.clearRollHistory()
```

##### `toJSON(): SerializedStatBlock`

Serialize stat block for saving.

```typescript
const saveData = character.toJSON()
localStorage.setItem('character', JSON.stringify(saveData))
```

##### `isDerived(statName: string): boolean`

Check if stat is derived (computed).

```typescript
character.isDerived('carryCapacity')  // true
```

### Stat Checks

#### `check(statBlock: StatBlock, statName: string, options: CheckOptions): CheckResult`

Perform a stat check with D&D 5e-style mechanics.

```typescript
import { check } from '@motioneffector/stats'

// Basic check (1d20 + stat modifier vs difficulty)
const result = check(character, 'strength', { difficulty: 15 })
// {
//   success: true,
//   roll: 14,
//   rolls: [14],
//   modifier: 2,
//   bonus: 0,
//   total: 16,
//   difficulty: 15,
//   margin: 1
// }

// With advantage
check(character, 'dexterity', {
  difficulty: 12,
  advantage: true  // Rolls 2d20, takes higher
})

// Custom dice
check(character, 'strength', {
  difficulty: 10,
  dice: '2d6'  // Use 2d6 instead of 1d20
})

// With bonus
check(character, 'strength', {
  difficulty: 15,
  bonus: 2,  // Add flat bonus
  modifier: 5  // Override calculated modifier
})
```

**Options:**
- `difficulty: number` - Target number to meet or exceed
- `dice?: string` - Dice notation (default: '1d20')
- `advantage?: boolean` - Roll twice, take higher
- `disadvantage?: boolean` - Roll twice, take lower
- `bonus?: number` - Additional flat bonus
- `modifier?: number` - Override calculated modifier

**Returns:** `CheckResult`
- `success: boolean` - Whether total >= difficulty
- `roll: number` - Final die result (highest/lowest if advantage/disadvantage)
- `rolls: number[]` - All dice rolled
- `modifier: number` - Stat modifier applied
- `bonus: number` - Additional bonus applied
- `total: number` - roll + modifier + bonus
- `difficulty: number` - Target number
- `margin: number` - total - difficulty

**Throws:** `TypeError` for non-existent stat

#### `saveThrow(statBlock: StatBlock, statName: string, difficulty: number): boolean`

Simplified check that returns only success/failure.

```typescript
import { saveThrow } from '@motioneffector/stats'

if (saveThrow(character, 'dexterity', 15)) {
  console.log('Dodged!')
}
```

### Derived Stats

#### `createDerivedStat(statBlock: StatBlock, name: string, formula: (block: StatBlock) => number): DerivedStat`

Create a computed stat that automatically recalculates when dependencies change.

```typescript
import { createDerivedStat } from '@motioneffector/stats'

// Carry capacity = Strength × 10
createDerivedStat(character, 'carryCapacity', (stats) =>
  stats.get('strength')! * 10
)

// Attack bonus = STR modifier + proficiency
createDerivedStat(character, 'attackBonus', (stats) =>
  Math.floor((stats.get('strength')! - 10) / 2) + stats.get('proficiency')!
)

// Access like any other stat
character.get('carryCapacity')  // 160

// Auto-updates when strength changes
character.set('strength', 20)
character.get('carryCapacity')  // 200
```

**Throws:** `CircularDependencyError` if formula creates a circular dependency

**Note:** Derived stats are read-only. Calling `set()`, `modify()`, or `addModifier()` on them throws `TypeError`.

### Utility Functions

#### `rollTable<T>(entries: TableEntry<T>[]): T`

Weighted random table selection.

```typescript
import { rollTable } from '@motioneffector/stats'

const loot = rollTable([
  { weight: 50, value: 'Common Item' },
  { weight: 30, value: 'Uncommon Item' },
  { weight: 15, value: 'Rare Item' },
  { weight: 5, value: 'Legendary Item' }
])
```

**Throws:** `ValidationError` for empty array, all-zero weights, or negative weights

#### `contest(a: StatBlock, statA: string, b: StatBlock, statB: string, options?: { dice?: string }): ContestResult`
#### `contest(modifierA: number, modifierB: number, options?: { dice?: string }): ContestResult`

Opposed roll between two entities or raw modifiers.

```typescript
import { contest } from '@motioneffector/stats'

// Stat block contest
const result = contest(hero, 'strength', monster, 'strength')
// { winner: 'a', rolls: { a: 17, b: 12 }, totals: { a: 20, b: 15 }, margin: 5 }

// Raw modifier contest
const result = contest(5, 3, { dice: '2d6' })
// { winner: 'a', rolls: { a: 9, b: 7 }, totals: { a: 14, b: 10 }, margin: 4 }
```

**Returns:** `ContestResult`
- `winner: 'a' | 'b' | 'tie'`
- `rolls: { a: number, b: number }`
- `totals: { a: number, b: number }`
- `margin: number` - Absolute difference

### Stat Templates

#### `createStatTemplate(config: TemplateConfig): StatTemplate`

Create reusable stat block templates.

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const characterTemplate = createStatTemplate({
  stats: {
    strength: { default: 10, min: 1, max: 20 },
    dexterity: { default: 10, min: 1, max: 20 },
    health: { default: 100, min: 0 }
  },
  options: {
    historyLimit: 50
  }
})

// Create independent instances
const warrior = characterTemplate.create({ strength: 16, health: 120 })
const rogue = characterTemplate.create({ dexterity: 18, health: 80 })
```

## Dice Notation Reference

| Notation | Meaning |
|----------|---------|
| `NdX` | Roll N dice with X sides |
| `d20` | Roll 1d20 (implied 1) |
| `NdX+M` | Roll and add modifier M |
| `NdX-M` | Roll and subtract modifier M |
| `NdXkhY` | Keep highest Y rolls |
| `NdXklY` | Keep lowest Y rolls |
| `NdXdhY` | Drop highest Y rolls |
| `NdXdlY` | Drop lowest Y rolls |
| `NdX!` | Exploding (reroll and add on max value, up to 100 times) |
| `NdXrY` | Reroll exactly Y (once per die) |
| `NdXr=Y` | Reroll exactly Y |
| `NdXr<Y` | Reroll less than Y |
| `NdXr<=Y` | Reroll less than or equal to Y |
| `NdXr>Y` | Reroll greater than Y |
| `NdXr>=Y` | Reroll greater than or equal to Y |

Multiple modifiers can be chained: `4d6!r1kh3+2`

## Error Handling

```typescript
import { ParseError, ValidationError, CircularDependencyError } from '@motioneffector/stats'

try {
  roll('invalid')
} catch (e) {
  if (e instanceof ParseError) {
    console.error('Invalid dice notation:', e.message)
  }
}

try {
  createStatBlock({ stat: { base: 50, min: 100, max: 10 } })
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Invalid configuration:', e.message)
  }
}
```

## Browser Support

Works in all modern browsers (ES2022+). For older browsers, use a transpiler like Babel.

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  StatBlock,
  StatDefinitions,
  RollResult,
  CheckResult,
  Modifier,
  ModifierInfo,
  StatChangeEvent
} from '@motioneffector/stats'
```

## License

MIT © [motioneffector](https://github.com/motioneffector)
