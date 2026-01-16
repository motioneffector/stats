# @motioneffector/stats

Stats aren't just numbers—they're living, reactive data. This library manages RPG stats as a collection of values with bounds, modifiers that come and go, and dependencies that auto-update. Roll dice with familiar D&D notation, make skill checks with advantage/disadvantage, run opposed contests, and track temporary buffs as they expire over time.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Character](Your-First-Character) |
| Understand how stat blocks work | [Stat Blocks](Concept-Stat-Blocks) |
| Roll dice with complex notation | [Rolling Dice](Guide-Rolling-Dice) |
| Add buffs and debuffs to stats | [Working with Modifiers](Guide-Working-With-Modifiers) |
| Make skill checks and saving throws | [Making Checks](Guide-Making-Checks) |
| Create stats that update automatically | [Using Derived Stats](Guide-Using-Derived-Stats) |
| Look up a specific method | [API Reference](API-Stat-Block) |

## Key Concepts

### Stat Blocks

A stat block is a collection of named numeric stats—like a character sheet. Each stat has a base value with optional min/max bounds, and can have modifiers stacked on top. Get the effective value (base + modifiers) or access the base directly.

### Dice Notation

Roll dice using standard RPG notation like `2d6+3` or `4d6kh3`. The library parses the notation and handles keep/drop highest/lowest, exploding dice, rerolls, and flat modifiers.

### Modifiers

Temporary or permanent bonuses and penalties applied to stats. Modifiers have a source name, can be flat additions or multipliers, and optionally expire after a number of ticks.

## Quick Example

```typescript
import { createStatBlock, roll, check } from '@motioneffector/stats'

// Create a character with stats
const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})

// Roll dice
const damage = roll('2d6+3')
console.log(damage.total) // e.g., 11

// Make a strength check against DC 15
const result = check(hero, 'strength', { difficulty: 15 })
console.log(result.success) // true or false
console.log(result.total)   // roll + modifier
```

---

**[Full API Reference →](API-Stat-Block)**
