# Rolling Dice

Roll dice using standard RPG notation and get detailed results including individual rolls, kept dice, and modifiers.

## Prerequisites

Before starting, you should:

- Understand [dice notation basics](Concept-Dice-Notation)

## Overview

We'll cover:

1. Basic dice rolling
2. Reading the result object
3. Using keep/drop modifiers
4. Exploding and reroll mechanics

## Step 1: Roll Basic Dice

Import the `roll` function and pass a notation string.

```typescript
import { roll } from '@motioneffector/stats'

const result = roll('2d6+3')
console.log(result.total) // e.g., 11
```

The notation `2d6+3` means: roll 2 six-sided dice and add 3.

## Step 2: Read the Result Object

The result contains everything about the roll:

```typescript
import { roll } from '@motioneffector/stats'

const result = roll('3d8+2')

console.log(result.total)    // Final sum (e.g., 17)
console.log(result.rolls)    // Individual dice [4, 6, 5]
console.log(result.kept)     // Dice that counted [4, 5, 6]
console.log(result.modifier) // Flat modifier (2)
console.log(result.notation) // Original string ('3d8+2')
```

- `total` = sum of `kept` + `modifier`
- `rolls` shows every die rolled (before keep/drop)
- `kept` shows dice that contributed to the total

## Step 3: Use Keep/Drop for Advantage

Roll multiple dice and keep only some of them:

```typescript
import { roll } from '@motioneffector/stats'

// Advantage: roll 2d20, keep highest
const advantage = roll('2d20kh1')
console.log(`Rolled ${advantage.rolls.join(' and ')}, kept ${advantage.kept[0]}`)

// Disadvantage: roll 2d20, keep lowest
const disadvantage = roll('2d20kl1')
console.log(`Rolled ${disadvantage.rolls.join(' and ')}, kept ${disadvantage.kept[0]}`)
```

Common patterns:
- `2d20kh1` — Advantage (keep highest)
- `2d20kl1` — Disadvantage (keep lowest)
- `4d6kh3` — Ability score generation (keep highest 3)
- `4d6dl1` — Same as above (drop lowest 1)

## Step 4: Use Exploding Dice

Add `!` to make dice explode (roll again on max value):

```typescript
import { roll } from '@motioneffector/stats'

const explosive = roll('2d6!')

console.log(explosive.rolls) // May have more than 2 values if explosions occurred
console.log(explosive.total)
```

If a d6 rolls a 6, it explodes—roll again and add to the total. Explosions can chain.

## Step 5: Reroll Low Values

Use `r` to reroll dice matching a condition:

```typescript
import { roll } from '@motioneffector/stats'

// Reroll 1s (Great Weapon Fighting style)
const gwf = roll('2d6r1')

// Reroll 1s and 2s
const gwfBetter = roll('2d6r<=2')
```

Each die rerolls at most once. The `rolls` array shows both the original and rerolled values.

## Complete Example

```typescript
import { roll } from '@motioneffector/stats'

// Simulate a D&D attack with a greatsword
function greatswordAttack(attackBonus: number, targetAC: number): void {
  // Attack roll
  const attack = roll(`1d20+${attackBonus}`)
  console.log(`Attack: ${attack.roll} + ${attackBonus} = ${attack.total}`)

  if (attack.total >= targetAC) {
    // Damage roll with Great Weapon Fighting (reroll 1s and 2s)
    const damage = roll('2d6r<=2+5')
    console.log(`Hit! Damage: ${damage.total}`)
    console.log(`  Dice: ${damage.rolls.join(', ')}`)
  } else {
    console.log('Miss!')
  }
}

greatswordAttack(7, 15)
```

## Variations

### Critical Hit (Double Dice)

```typescript
import { roll } from '@motioneffector/stats'

function rollDamage(isCritical: boolean): number {
  const dice = isCritical ? '4d6+3' : '2d6+3'
  return roll(dice).total
}
```

### Percentile Dice (d100)

```typescript
import { roll } from '@motioneffector/stats'

const percentile = roll('1d100')
console.log(`Rolled: ${percentile.total}%`)
```

### Savage Worlds Exploding Trait Die

```typescript
import { roll } from '@motioneffector/stats'

// d8 trait die + d6 wild die, both exploding
const traitDie = roll('1d8!')
const wildDie = roll('1d6!')
const result = Math.max(traitDie.total, wildDie.total)
console.log(`Best of ${traitDie.total} or ${wildDie.total}: ${result}`)
```

## Troubleshooting

### Invalid Notation Error

**Symptom:** `ParseError: Invalid dice notation`

**Cause:** The notation string has a syntax error.

**Solution:** Check for typos. Valid format is `[count]d[sides][modifiers]`. Examples: `2d6`, `d20+5`, `4d6kh3`.

### Unexpected Total

**Symptom:** Total doesn't match what you expected.

**Cause:** Keep/drop or explosions affected the result.

**Solution:** Check `result.rolls` and `result.kept` to see what happened. With `4d6kh3`, four dice are rolled but only three count.

## See Also

- **[Dice Notation](Concept-Dice-Notation)** — Full notation reference
- **[Making Checks](Guide-Making-Checks)** — Using dice in skill checks
- **[Dice API](API-Dice)** — `roll()` function reference
