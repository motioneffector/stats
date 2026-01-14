# Dice API

Functions for rolling dice with standard RPG notation.

---

## `roll()`

Roll dice using RPG notation and get detailed results.

**Signature:**

```typescript
function roll(notation: string, options?: RollOptions): RollResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notation` | `string` | Yes | Dice notation (e.g., `"2d6+3"`, `"4d6kh3"`) |
| `options` | `RollOptions` | No | Reserved for future use |

**Returns:** `RollResult` — Object containing roll details

**Example:**

```typescript
import { roll } from '@motioneffector/stats'

const result = roll('4d6kh3+2')

console.log(result.total)    // e.g., 14
console.log(result.rolls)    // e.g., [3, 4, 5, 6]
console.log(result.kept)     // e.g., [4, 5, 6]
console.log(result.modifier) // 2
console.log(result.notation) // '4d6kh3+2'
```

**Throws:**

- `ParseError` — When notation is invalid or malformed

**Notation Reference:**

| Syntax | Meaning | Example |
|--------|---------|---------|
| `NdS` | Roll N dice with S sides | `2d6` |
| `dS` | Roll 1 die (implied) | `d20` |
| `+N` | Add N to total | `1d20+5` |
| `-N` | Subtract N from total | `2d6-1` |
| `khN` | Keep highest N dice | `4d6kh3` |
| `klN` | Keep lowest N dice | `2d20kl1` |
| `dhN` | Drop highest N dice | `4d6dh1` |
| `dlN` | Drop lowest N dice | `4d6dl1` |
| `!` | Exploding (reroll on max) | `1d6!` |
| `rN` | Reroll dice equal to N | `2d6r1` |
| `r<N` | Reroll dice less than N | `2d6r<3` |
| `r<=N` | Reroll dice <= N | `2d6r<=2` |
| `r>N` | Reroll dice greater than N | `2d6r>5` |
| `r>=N` | Reroll dice >= N | `2d6r>=5` |

---

## Types

### `RollResult`

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

```typescript
interface RollOptions {
  context?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `context` | `string` | Optional context for roll history |

---

## Related

- **[Dice Notation](Concept-Dice-Notation)** — Full notation guide
- **[Rolling Dice](Guide-Rolling-Dice)** — Usage patterns and examples
