# Making Checks

Perform skill checks against a difficulty class, apply advantage/disadvantage, and run opposed contests between characters.

## Prerequisites

Before starting, you should:

- [Create a stat block](Your-First-Character)
- Understand [checks and contests](Concept-Checks-And-Contests)

## Overview

We'll cover:

1. Making basic skill checks
2. Using advantage and disadvantage
3. Adding proficiency and other bonuses
4. Running saving throws
5. Running opposed contests

## Step 1: Make a Basic Check

Use `check()` with a stat block, stat name, and difficulty:

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

const result = check(hero, 'strength', { difficulty: 15 })

console.log(result.success)  // true or false
console.log(result.roll)     // the d20 result (e.g., 12)
console.log(result.modifier) // +3 (from 16 strength)
console.log(result.total)    // 15 (roll + modifier)
console.log(result.margin)   // 0 (total - difficulty)
```

The modifier is calculated using the D&D formula: `floor((stat - 10) / 2)`.

## Step 2: Apply Advantage or Disadvantage

Set `advantage: true` or `disadvantage: true` in the options:

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  dexterity: { base: 14 }
})

// Roll with advantage (2d20, take higher)
const stealthCheck = check(hero, 'dexterity', {
  difficulty: 12,
  advantage: true
})

console.log(stealthCheck.rolls) // [8, 17] — both d20 results
console.log(stealthCheck.roll)  // 17 — the higher one
console.log(stealthCheck.total) // 19 (17 + 2 modifier)
```

For disadvantage:

```typescript
const disadvantagedCheck = check(hero, 'dexterity', {
  difficulty: 12,
  disadvantage: true
})

console.log(disadvantagedCheck.roll) // The lower of two d20s
```

If both advantage and disadvantage apply, they cancel out:

```typescript
const canceledCheck = check(hero, 'dexterity', {
  difficulty: 12,
  advantage: true,
  disadvantage: true
})
// Rolls 1d20 normally
```

## Step 3: Add Proficiency and Bonuses

Use the `bonus` option for additional modifiers:

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  wisdom: { base: 14 }
})

const proficiencyBonus = 3
const expertiseBonus = 3 // Double proficiency

const perceptionCheck = check(hero, 'wisdom', {
  difficulty: 15,
  bonus: proficiencyBonus + expertiseBonus
})

// Total = d20 + wisdom mod (+2) + bonus (+6)
console.log(perceptionCheck.total)
console.log(perceptionCheck.bonus) // 6
```

## Step 4: Use Saving Throws

For simple pass/fail checks, use `saveThrow()`:

```typescript
import { createStatBlock, saveThrow } from '@motioneffector/stats'

const hero = createStatBlock({
  constitution: { base: 12 }
})

const passed = saveThrow(hero, 'constitution', 14)

if (passed) {
  console.log('Resisted the effect!')
} else {
  console.log('Failed the save!')
}
```

This is a shorthand for `check(...).success`.

## Step 5: Run Opposed Contests

Use `contest()` when two characters compete:

```typescript
import { createStatBlock, contest } from '@motioneffector/stats'

const hero = createStatBlock({ strength: { base: 16 } })
const orc = createStatBlock({ strength: { base: 14 } })

const grapple = contest(hero, 'strength', orc, 'strength')

console.log(grapple.winner)  // 'a', 'b', or 'tie'
console.log(grapple.rolls)   // { a: 14, b: 8 }
console.log(grapple.totals)  // { a: 17, b: 10 }
console.log(grapple.margin)  // 7
```

You can also contest raw modifiers without stat blocks:

```typescript
import { contest } from '@motioneffector/stats'

// Contest between modifier +5 and modifier +3
const result = contest(5, 3)
console.log(result.winner)
```

## Complete Example

```typescript
import { createStatBlock, check, saveThrow, contest } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 },
  dexterity: { base: 14 },
  constitution: { base: 12 },
  wisdom: { base: 10 }
})

const goblin = createStatBlock({
  strength: { base: 8 },
  dexterity: { base: 14 }
})

// Hero attacks with advantage (flanking)
const attack = check(hero, 'strength', {
  difficulty: 13, // Goblin AC
  advantage: true,
  bonus: 2 // Proficiency
})

if (attack.success) {
  console.log(`Hit! Rolled ${attack.total} vs AC 13`)

  // Goblin tries to escape with a contest
  const escape = contest(goblin, 'dexterity', hero, 'strength')

  if (escape.winner === 'a') {
    console.log('Goblin escapes!')
  } else {
    console.log('Goblin is grappled!')
  }
} else {
  console.log('Miss!')
}

// Later, hero must save against poison
const poisonDC = 12
if (!saveThrow(hero, 'constitution', poisonDC)) {
  console.log('Hero is poisoned!')
}
```

## Variations

### Custom Dice (Non-D&D)

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  skill: { base: 5 }
})

// Roll 2d10 instead of 1d20
const result = check(hero, 'skill', {
  difficulty: 15,
  dice: '2d10'
})
```

### Custom Modifier Formula

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

// Use stat value directly (no D&D formula)
const hero = createStatBlock(
  { agility: { base: 7 } },
  { modifierFormula: (value) => value }
)

const result = check(hero, 'agility', { difficulty: 10 })
console.log(result.modifier) // 7 (the stat value itself)
```

### Override Modifier Per-Check

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

// Force modifier to be +5 instead of calculated +3
const result = check(hero, 'strength', {
  difficulty: 15,
  modifier: 5
})

console.log(result.modifier) // 5
```

## Troubleshooting

### Stat Not Found Error

**Symptom:** `TypeError: Cannot check non-existent stat`

**Cause:** The stat name doesn't exist in the stat block.

**Solution:** Check spelling. Use `statBlock.has('statName')` to verify.

### Unexpected Modifier

**Symptom:** The modifier isn't what you expected.

**Cause:** The D&D formula `floor((stat - 10) / 2)` may not match your system.

**Solution:** Use `modifierFormula` in stat block options, or `modifier` in check options.

## See Also

- **[Checks and Contests](Concept-Checks-And-Contests)** — Conceptual overview
- **[Dice Notation](Concept-Dice-Notation)** — Custom dice options
- **[Checks API](API-Checks)** — Full reference for `check`, `saveThrow`, `contest`
