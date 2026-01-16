# Your First Character

Create a character with stats, roll dice for damage, and make skill checks—all in about 5 minutes.

By the end of this guide, you'll have a working character that can take damage, receive buffs, and make strength checks.

## What We're Building

A simple hero with three stats: strength, dexterity, and health. You'll roll dice to deal damage, apply a temporary buff, and make a skill check against a difficulty class.

## Step 1: Create a Stat Block

Every character starts with a stat block—a container for all their stats.

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})
```

Each stat has a `base` value and optional `min`/`max` bounds. The bounds prevent stats from going below or above the limits.

## Step 2: Read and Modify Stats

Get stat values with `get()` and change them with `set()` or `modify()`.

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})

console.log(hero.get('health')) // 45

// Take 10 damage
hero.modify('health', -10)
console.log(hero.get('health')) // 35

// Heal to full
hero.set('health', 100)
console.log(hero.get('health')) // 100
```

The `modify()` method adds or subtracts from the current base. The `set()` method replaces it entirely. Both respect the min/max bounds.

## Step 3: Roll Dice

Use the `roll()` function with standard dice notation.

```typescript
import { roll } from '@motioneffector/stats'

const damage = roll('2d6+3')
console.log(damage.total)    // e.g., 11
console.log(damage.rolls)    // e.g., [4, 4]
console.log(damage.modifier) // 3
```

The result includes the total, individual die rolls, and any flat modifier from the notation.

## Step 4: Make a Skill Check

Use `check()` to roll against a difficulty class (DC) using D&D 5e mechanics.

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 }
})

const result = check(hero, 'strength', { difficulty: 15 })

console.log(result.success)  // true or false
console.log(result.roll)     // the d20 roll
console.log(result.modifier) // +3 (from 16 strength)
console.log(result.total)    // roll + modifier
```

The modifier is calculated using the D&D formula: `Math.floor((stat - 10) / 2)`. A strength of 16 gives a +3 modifier.

## The Complete Code

Here's everything together:

```typescript
import { createStatBlock, roll, check } from '@motioneffector/stats'

// Create a hero
const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})

// Roll for damage
const damage = roll('2d6+3')
console.log(`Dealt ${damage.total} damage`)

// Apply damage to enemy (or self for testing)
hero.modify('health', -damage.total)
console.log(`Health: ${hero.get('health')}`)

// Make a strength check to lift a boulder (DC 15)
const liftCheck = check(hero, 'strength', { difficulty: 15 })
if (liftCheck.success) {
  console.log(`Success! Rolled ${liftCheck.total} vs DC 15`)
} else {
  console.log(`Failed. Rolled ${liftCheck.total} vs DC 15`)
}
```

## What's Next?

Now that you have the basics:

- **[Understand Stat Blocks](Concept-Stat-Blocks)** — Learn how stats, bounds, and effective values work
- **[Add Temporary Buffs](Guide-Working-With-Modifiers)** — Apply modifiers that expire over time
- **[Make Checks with Advantage](Guide-Making-Checks)** — Roll with advantage, disadvantage, and custom dice
- **[Explore the API](API-Stat-Block)** — Full reference for all stat block methods
