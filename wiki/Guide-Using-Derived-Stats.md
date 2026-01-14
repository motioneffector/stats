# Using Derived Stats

Create stats that automatically calculate from other stats. When dependencies change, derived stats update automatically.

## Prerequisites

Before starting, you should:

- [Create a stat block](Your-First-Character)
- Understand [derived stats concepts](Concept-Derived-Stats)

## Overview

We'll cover:

1. Creating a derived stat
2. Using multiple dependencies
3. Listening for changes
4. Handling serialization

## Step 1: Create a Derived Stat

Use `createDerivedStat()` with a formula function:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

console.log(hero.get('carryCapacity')) // 240
```

The formula receives the stat block and can read any stats.

## Step 2: Watch It Auto-Update

When you change a dependency, the derived stat recalculates:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

console.log(hero.get('carryCapacity')) // 240

hero.set('strength', 18)
console.log(hero.get('carryCapacity')) // 270

hero.addModifier('strength', { value: 4, source: 'belt-of-giant-strength' })
console.log(hero.get('carryCapacity')) // 330 (22 × 15)
```

## Step 3: Use Multiple Dependencies

A derived stat can depend on multiple source stats:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  dexterity: { base: 14 },
  armorBonus: { base: 2 },
  shieldBonus: { base: 0 }
})

createDerivedStat(hero, 'armorClass', (stats) => {
  const dexMod = Math.floor((stats.get('dexterity')! - 10) / 2)
  return 10 + dexMod + stats.get('armorBonus')! + stats.get('shieldBonus')!
})

console.log(hero.get('armorClass')) // 14 (10 + 2 + 2 + 0)

// Equip a shield
hero.set('shieldBonus', 2)
console.log(hero.get('armorClass')) // 16

// Increase dexterity
hero.set('dexterity', 16)
console.log(hero.get('armorClass')) // 17
```

## Step 4: Listen for Changes

Subscribe to derived stat changes with `onStat()`:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

hero.onStat('carryCapacity', (event) => {
  console.log(`Carry capacity: ${event.oldValue} → ${event.newValue}`)
})

hero.set('strength', 18)
// Logs: "Carry capacity: 240 → 270"
```

Or use `onChange()` to catch all stat changes:

```typescript
hero.onChange((event) => {
  console.log(`${event.stat} changed to ${event.newValue}`)
})
```

## Step 5: Handle Serialization

Derived stats are **not** included in `toJSON()`. Re-create them after loading:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

function createHero(savedData?: object) {
  const hero = createStatBlock(
    { strength: { base: 16 } },
    savedData ? { fromJSON: savedData as any } : undefined
  )

  // Always re-create derived stats
  createDerivedStat(hero, 'carryCapacity', (stats) => {
    return stats.get('strength')! * 15
  })

  return hero
}

// Save
const hero = createHero()
const saved = hero.toJSON()

// Load
const loadedHero = createHero(saved)
console.log(loadedHero.get('carryCapacity')) // Works!
```

## Complete Example

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const wizard = createStatBlock({
  intelligence: { base: 18 },
  proficiencyBonus: { base: 3 },
  level: { base: 5 }
})

// Spell save DC = 8 + proficiency + INT mod
createDerivedStat(wizard, 'spellSaveDC', (stats) => {
  const intMod = Math.floor((stats.get('intelligence')! - 10) / 2)
  return 8 + stats.get('proficiencyBonus')! + intMod
})

// Spell attack bonus = proficiency + INT mod
createDerivedStat(wizard, 'spellAttackBonus', (stats) => {
  const intMod = Math.floor((stats.get('intelligence')! - 10) / 2)
  return stats.get('proficiencyBonus')! + intMod
})

// Prepared spells = INT mod + level
createDerivedStat(wizard, 'preparedSpells', (stats) => {
  const intMod = Math.floor((stats.get('intelligence')! - 10) / 2)
  return intMod + stats.get('level')!
})

console.log(`Spell Save DC: ${wizard.get('spellSaveDC')}`)       // 15
console.log(`Spell Attack: +${wizard.get('spellAttackBonus')}`)  // +7
console.log(`Prepared Spells: ${wizard.get('preparedSpells')}`)  // 9

// Level up!
wizard.set('level', 6)
wizard.set('proficiencyBonus', 3) // Still 3 at level 6

console.log(`Prepared Spells: ${wizard.get('preparedSpells')}`)  // 10
```

## Variations

### Derived Stat with Modifiers

Derived stats can read stats that have modifiers:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 }
})

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15 // Uses effective value
})

hero.addModifier('strength', { value: 4, source: 'enlarge' })
console.log(hero.get('carryCapacity')) // 270 (18 × 15)
```

### Conditional Logic

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const character = createStatBlock({
  dexterity: { base: 16 },
  armorType: { base: 0 } // 0=none, 1=light, 2=medium, 3=heavy
})

createDerivedStat(character, 'maxDexBonus', (stats) => {
  const armorType = stats.get('armorType')!
  if (armorType === 0) return Infinity
  if (armorType === 1) return Infinity // Light armor
  if (armorType === 2) return 2        // Medium armor
  return 0                              // Heavy armor
})
```

## Troubleshooting

### CircularDependencyError

**Symptom:** `CircularDependencyError: Circular dependency detected`

**Cause:** A derived stat depends on itself, or two derived stats depend on each other.

**Solution:** Redesign your formulas. Derived stats can only depend on base stats or derived stats that don't create a cycle.

### Derived Stat Returns Undefined

**Symptom:** `get()` returns `undefined` or the formula throws.

**Cause:** The formula is accessing a stat that doesn't exist.

**Solution:** Check stat names. Use `stats.has('name')` to verify stats exist.

## See Also

- **[Derived Stats](Concept-Derived-Stats)** — Conceptual overview
- **[Saving and Loading State](Guide-Saving-And-Loading-State)** — Handling serialization
- **[Checks API](API-Checks)** — `createDerivedStat` reference
