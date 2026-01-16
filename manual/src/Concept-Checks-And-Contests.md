# Checks and Contests

A check tests whether a character succeeds at a task by rolling dice and comparing the result to a difficulty class (DC). A contest pits two characters against each other, each rolling and comparing totals. Both use D&D 5e-style mechanics with advantage and disadvantage.

## How It Works

### Checks

A check rolls dice (default: 1d20), adds the stat's modifier, and compares to the DC:

```
Total = Roll + Modifier + Bonus
Success = Total >= DC
```

The modifier is calculated from the stat value using the D&D formula by default:

```
Modifier = floor((stat - 10) / 2)
```

| Stat Value | Modifier |
|------------|----------|
| 1 | -5 |
| 10 | 0 |
| 14 | +2 |
| 18 | +4 |
| 20 | +5 |

### Contests

A contest has both participants roll. Whoever has the higher total wins:

```
Participant A: Roll + Modifier
Participant B: Roll + Modifier
Winner = higher total (tie if equal)
```

## Basic Usage

```typescript
import { createStatBlock, check, contest } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

// Make a strength check against DC 15
const result = check(hero, 'strength', { difficulty: 15 })

console.log(result.success)  // true or false
console.log(result.roll)     // the d20 result
console.log(result.modifier) // +3 (from 16 strength)
console.log(result.total)    // roll + modifier
console.log(result.margin)   // how much you beat/missed the DC by
```

The `margin` is positive if you succeeded, negative if you failed.

## Key Points

- **Default dice is 1d20** — Override with the `dice` option for other systems.
- **Advantage rolls twice, takes higher** — Disadvantage takes lower. Both cancel out.
- **Custom modifier formulas are supported** — Set `modifierFormula` in stat block options.
- **The `bonus` option adds to the roll** — Use for proficiency, situational bonuses, etc.

## Advantage and Disadvantage

When you have advantage, roll twice and take the higher result. Disadvantage takes the lower. If you have both, they cancel out and you roll normally.

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  dexterity: { base: 14 }
})

// Roll with advantage (two d20s, take higher)
const stealthCheck = check(hero, 'dexterity', {
  difficulty: 12,
  advantage: true
})

console.log(stealthCheck.rolls) // [8, 15] — both rolls shown
console.log(stealthCheck.roll)  // 15 — the one that counted
```

## Examples

### Skill Check with Proficiency Bonus

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  wisdom: { base: 14 }
})

const proficiencyBonus = 3

const perceptionCheck = check(hero, 'wisdom', {
  difficulty: 15,
  bonus: proficiencyBonus
})

// Total = d20 roll + wisdom modifier (+2) + proficiency (+3)
```

### Saving Throw (Simple Pass/Fail)

```typescript
import { createStatBlock, saveThrow } from '@motioneffector/stats'

const hero = createStatBlock({
  constitution: { base: 12 }
})

const passed = saveThrow(hero, 'constitution', 14)
if (passed) {
  console.log('Resisted the poison!')
} else {
  console.log('Poisoned!')
}
```

The `saveThrow` function is a simplified wrapper that returns just a boolean.

### Opposed Contest

```typescript
import { createStatBlock, contest } from '@motioneffector/stats'

const hero = createStatBlock({ strength: { base: 16 } })
const orc = createStatBlock({ strength: { base: 14 } })

const grapple = contest(hero, 'strength', orc, 'strength')

console.log(grapple.winner) // 'a', 'b', or 'tie'
console.log(grapple.totals) // { a: 18, b: 12 }
console.log(grapple.margin) // 6
```

### Custom Dice (Non-D&D Systems)

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

const hero = createStatBlock({
  skill: { base: 5 }
})

// Roll 2d10 instead of 1d20
const result = check(hero, 'skill', {
  difficulty: 12,
  dice: '2d10'
})
```

### Custom Modifier Formula

```typescript
import { createStatBlock, check } from '@motioneffector/stats'

// Use stat value directly as modifier (no D&D formula)
const hero = createStatBlock(
  { skill: { base: 5 } },
  { modifierFormula: (value) => value }
)

const result = check(hero, 'skill', { difficulty: 10 })
console.log(result.modifier) // 5 (the stat value itself)
```

## Related

- **[Dice Notation](Concept-Dice-Notation)** — Understanding dice syntax for custom rolls
- **[Making Checks](Guide-Making-Checks)** — Step-by-step guide to checks and contests
- **[Checks API](API-Checks)** — Full reference for `check`, `saveThrow`, `contest`
