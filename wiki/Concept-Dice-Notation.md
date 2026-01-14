# Dice Notation

Dice notation is a mini-language for describing dice rolls. Instead of writing code to roll three six-sided dice and add four, you write `3d6+4`. The library parses this notation and executes the roll, handling all the complexity of keep/drop, explosions, and rerolls.

## How It Works

The basic format is `[count]d[sides][modifiers]`:

- **count**: Number of dice to roll (default: 1)
- **d**: The separator (case-insensitive)
- **sides**: Number of sides on each die
- **modifiers**: Optional additions like `+3`, `kh2`, or `!`

Examples:
- `d20` — Roll one 20-sided die
- `2d6` — Roll two 6-sided dice, sum them
- `4d6kh3` — Roll four d6, keep the highest three
- `1d6!` — Roll a d6, explode on max (roll again and add)
- `2d20kl1` — Roll two d20, keep the lowest (disadvantage)

## Basic Usage

```typescript
import { roll } from '@motioneffector/stats'

const result = roll('2d6+3')

console.log(result.total)    // e.g., 11 (sum of dice + modifier)
console.log(result.rolls)    // e.g., [4, 4] (individual die results)
console.log(result.kept)     // e.g., [4, 4] (dice that counted)
console.log(result.modifier) // 3 (flat modifier from notation)
console.log(result.notation) // '2d6+3' (original input)
```

The `rolls` array shows every die rolled. The `kept` array shows which dice contributed to the total (relevant when using keep/drop).

## Key Points

- **Case insensitive** — `2D6`, `2d6`, and `2D6` all work the same.
- **Implied count** — `d20` means `1d20`.
- **Modifiers stack** — `2d6+3-1` results in a +2 modifier.
- **Keep/drop affects `kept`** — With `4d6kh3`, all four dice appear in `rolls`, but only three appear in `kept`.
- **Order matters for some modifiers** — Exploding happens before rerolls.

## Modifier Reference

### Flat Modifiers

Add or subtract a fixed number:

```typescript
roll('1d20+5')  // Add 5 to total
roll('2d6-2')   // Subtract 2 from total
roll('1d8+2-1') // Net +1 modifier
```

### Keep Highest (kh)

Keep only the N highest dice:

```typescript
roll('4d6kh3')  // Roll 4d6, keep highest 3 (ability score generation)
roll('2d20kh1') // Roll 2d20, keep highest (advantage)
```

### Keep Lowest (kl)

Keep only the N lowest dice:

```typescript
roll('2d20kl1') // Roll 2d20, keep lowest (disadvantage)
roll('4d6kl2')  // Roll 4d6, keep lowest 2
```

### Drop Highest (dh)

Drop the N highest dice, keep the rest:

```typescript
roll('4d6dh1') // Roll 4d6, drop highest 1 (same as kl3)
```

### Drop Lowest (dl)

Drop the N lowest dice, keep the rest:

```typescript
roll('4d6dl1') // Roll 4d6, drop lowest 1 (same as kh3)
```

### Exploding (!)

When a die rolls its maximum value, roll again and add:

```typescript
roll('1d6!')  // If you roll 6, roll again and add
roll('3d10!') // Each die that rolls 10 explodes
```

Explosions can chain—rolling max again triggers another explosion (up to 100 times to prevent infinite loops).

### Reroll (r)

Reroll dice matching a condition (once per die):

```typescript
roll('1d20r1')   // Reroll 1s
roll('4d6r<=2')  // Reroll dice showing 1 or 2
roll('2d6r<3')   // Reroll dice less than 3
```

Supported operators: `=`, `<`, `>`, `<=`, `>=`

## Examples

### D&D Ability Score Generation

```typescript
import { roll } from '@motioneffector/stats'

// 4d6 drop lowest
const stat = roll('4d6dl1')
console.log(stat.total) // e.g., 14
```

### Attack with Advantage

```typescript
import { roll } from '@motioneffector/stats'

const attack = roll('2d20kh1+5')
console.log(`Attack roll: ${attack.total}`)
console.log(`Rolls: ${attack.rolls.join(', ')}`) // Shows both d20 results
```

### Great Weapon Fighting (Reroll 1s and 2s)

```typescript
import { roll } from '@motioneffector/stats'

const damage = roll('2d6r<=2+4')
console.log(`Damage: ${damage.total}`)
```

### Exploding Damage

```typescript
import { roll } from '@motioneffector/stats'

const crit = roll('4d6!')
console.log(`Explosive damage: ${crit.total}`)
console.log(`All rolls: ${crit.rolls.join(', ')}`) // May have more than 4 values
```

## Related

- **[Rolling Dice](Guide-Rolling-Dice)** — Practical guide with common patterns
- **[Dice API](API-Dice)** — Full `roll()` function reference
- **[Checks and Contests](Concept-Checks-And-Contests)** — Using dice rolls in skill checks
