# Checks API

Functions for skill checks, saving throws, contests, and derived stats.

---

## `check()`

Perform a skill check against a difficulty class.

**Signature:**

```typescript
function check(
  statBlock: StatBlock,
  statName: string,
  options: CheckOptions
): CheckResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statBlock` | `StatBlock` | Yes | The stat block to check against |
| `statName` | `string` | Yes | Name of the stat to use |
| `options` | `CheckOptions` | Yes | Check configuration |

**Returns:** `CheckResult` — The check result

**Example:**

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({ strength: { base: 16 } })

const result = check(hero, 'strength', {
  difficulty: 15,
  advantage: true,
  bonus: 2
})

console.log(result.success) // true or false
console.log(result.total)   // roll + modifier + bonus
```

**Throws:**

- `TypeError` — If stat doesn't exist

---

## `saveThrow()`

Perform a simple saving throw (returns boolean).

**Signature:**

```typescript
function saveThrow(
  statBlock: StatBlock,
  statName: string,
  difficulty: number
): boolean
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statBlock` | `StatBlock` | Yes | The stat block |
| `statName` | `string` | Yes | Name of the stat |
| `difficulty` | `number` | Yes | Target DC |

**Returns:** `boolean` — `true` if successful

**Example:**

```typescript
import { createStatBlock, saveThrow } from '@motioneffector/stats'

const hero = createStatBlock({ constitution: { base: 14 } })

if (saveThrow(hero, 'constitution', 12)) {
  console.log('Resisted!')
}
```

---

## `contest()`

Run an opposed contest between two participants.

**Signature:**

```typescript
// With stat blocks
function contest(
  statBlockA: StatBlock,
  statNameA: string,
  statBlockB: StatBlock,
  statNameB: string,
  options?: ContestOptions
): ContestResult

// With raw modifiers
function contest(
  modifierA: number,
  modifierB: number,
  options?: ContestOptions
): ContestResult
```

**Parameters (stat blocks):**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statBlockA` | `StatBlock` | Yes | First participant's stat block |
| `statNameA` | `string` | Yes | First participant's stat |
| `statBlockB` | `StatBlock` | Yes | Second participant's stat block |
| `statNameB` | `string` | Yes | Second participant's stat |
| `options` | `ContestOptions` | No | Contest configuration |

**Parameters (raw modifiers):**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `modifierA` | `number` | Yes | First participant's modifier |
| `modifierB` | `number` | Yes | Second participant's modifier |
| `options` | `ContestOptions` | No | Contest configuration |

**Returns:** `ContestResult` — The contest result

**Example:**

```typescript
import { createStatBlock, contest } from '@motioneffector/stats'

const hero = createStatBlock({ strength: { base: 16 } })
const orc = createStatBlock({ strength: { base: 14 } })

const result = contest(hero, 'strength', orc, 'strength')

console.log(result.winner) // 'a', 'b', or 'tie'
console.log(result.margin) // Difference between totals
```

**Throws:**

- `TypeError` — If stats don't exist or arguments are invalid

---

## `createDerivedStat()`

Create a stat that auto-calculates from other stats.

**Signature:**

```typescript
function createDerivedStat(
  statBlock: StatBlock,
  name: string,
  formula: (statBlock: StatBlock) => number
): { getValue: () => number }
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `statBlock` | `StatBlock` | Yes | The stat block to add to |
| `name` | `string` | Yes | Name for the derived stat |
| `formula` | `(statBlock: StatBlock) => number` | Yes | Calculation function |

**Returns:** `{ getValue: () => number }` — Accessor for the derived value

**Example:**

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({ strength: { base: 16 } })

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

hero.get('carryCapacity') // 240
```

**Throws:**

- `CircularDependencyError` — If formula creates a circular dependency

---

## Types

### `CheckOptions`

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

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `difficulty` | `number` | Yes | Target DC |
| `dice` | `string` | No | Dice notation. Default: `'1d20'` |
| `advantage` | `boolean` | No | Roll twice, take higher |
| `disadvantage` | `boolean` | No | Roll twice, take lower |
| `bonus` | `number` | No | Additional bonus to add |
| `modifier` | `number` | No | Override calculated modifier |

### `CheckResult`

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

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | Whether the check passed |
| `roll` | `number` | The selected die result |
| `rolls` | `number[]` | All dice rolled (for advantage/disadvantage) |
| `modifier` | `number` | Stat modifier applied |
| `bonus` | `number` | Additional bonus applied |
| `total` | `number` | Final total (roll + modifier + bonus) |
| `difficulty` | `number` | The DC that was checked against |
| `margin` | `number` | Total - difficulty (positive = success margin) |

### `ContestOptions`

```typescript
interface ContestOptions {
  dice?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `dice` | `string` | Dice notation. Default: `'1d20'` |

### `ContestResult`

```typescript
interface ContestResult {
  winner: 'a' | 'b' | 'tie'
  rolls: { a: number; b: number }
  totals: { a: number; b: number }
  margin: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `winner` | `'a' \| 'b' \| 'tie'` | Who won the contest |
| `rolls` | `{ a: number; b: number }` | Raw die results |
| `totals` | `{ a: number; b: number }` | Final totals |
| `margin` | `number` | Absolute difference between totals |

---

## Related

- **[Checks and Contests](Concept-Checks-And-Contests)** — Conceptual overview
- **[Derived Stats](Concept-Derived-Stats)** — How derived stats work
- **[Making Checks](Guide-Making-Checks)** — Practical guide
