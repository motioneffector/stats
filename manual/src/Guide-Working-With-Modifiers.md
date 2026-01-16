# Working with Modifiers

Add temporary buffs, permanent equipment bonuses, and debuffs that expire over time. Track modifier durations and manage stacking effects.

## Prerequisites

Before starting, you should:

- [Create a stat block](Your-First-Character)
- Understand [how modifiers work](Concept-Modifiers)

## Overview

We'll cover:

1. Adding modifiers to stats
2. Viewing and removing modifiers
3. Setting up timed modifiers
4. Using the tick system for expiration
5. Handling modifier stacking

## Step 1: Add a Modifier

Use `addModifier()` with the stat name and modifier details:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 }
})

hero.addModifier('strength', {
  value: 2,
  source: 'bull-strength'
})

console.log(hero.get('strength')) // 16 (14 + 2)
console.log(hero.getBase('strength')) // 14 (unchanged)
```

The `source` is a unique identifier for the modifier. Use descriptive names.

## Step 2: View Active Modifiers

Use `getModifiers()` to see all modifiers on a stat:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  armor: { base: 10 }
})

hero.addModifier('armor', { value: 2, source: 'shield' })
hero.addModifier('armor', { value: 3, source: 'chainmail' })

const mods = hero.getModifiers('armor')
console.log(mods)
// [
//   { value: 2, source: 'shield', type: 'flat', duration: 'permanent' },
//   { value: 3, source: 'chainmail', type: 'flat', duration: 'permanent' }
// ]
```

## Step 3: Remove a Modifier

Use `removeModifier()` with the stat name and source:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  armor: { base: 10 }
})

hero.addModifier('armor', { value: 2, source: 'shield' })
hero.get('armor') // 12

hero.removeModifier('armor', 'shield')
hero.get('armor') // 10
```

Returns `true` if a modifier was removed, `false` if not found.

## Step 4: Add Timed Modifiers

Set `duration` to make modifiers expire:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  speed: { base: 30 }
})

// Lasts for 3 ticks (e.g., 3 rounds)
hero.addModifier('speed', {
  value: 10,
  source: 'haste',
  duration: 3
})

// Lasts for 1 tick
hero.addModifier('speed', {
  value: 5,
  source: 'dash',
  duration: 'temporary'
})

console.log(hero.get('speed')) // 45
```

## Step 5: Advance Time with tick()

Call `tick()` to decrement durations and expire modifiers:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  speed: { base: 30 }
})

hero.addModifier('speed', { value: 10, source: 'haste', duration: 2 })

console.log(hero.get('speed')) // 40

hero.tick() // 1 tick remaining
console.log(hero.get('speed')) // 40

hero.tick() // Haste expires
console.log(hero.get('speed')) // 30
```

The `tick()` method returns an array of expired modifier sources:

```typescript
const expired = hero.tick()
console.log(expired) // ['haste']
```

## Step 6: Check Remaining Duration

Use `getRemainingDuration()` to see how many ticks are left:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 }
})

hero.addModifier('strength', { value: 4, source: 'rage', duration: 5 })

console.log(hero.getRemainingDuration('strength', 'rage')) // 5

hero.tick()
hero.tick()

console.log(hero.getRemainingDuration('strength', 'rage')) // 3
```

Returns `Infinity` for permanent modifiers, `undefined` if not found.

## Complete Example

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 },
  armor: { base: 10 },
  speed: { base: 30 }
})

// Permanent equipment
hero.addModifier('armor', { value: 5, source: 'plate-armor' })
hero.addModifier('armor', { value: 2, source: 'shield' })

// Temporary buff (3 rounds)
hero.addModifier('strength', { value: 4, source: 'rage', duration: 3 })

// One-round dash
hero.addModifier('speed', { value: 15, source: 'dash', duration: 'temporary' })

console.log('Round start:')
console.log(`  Strength: ${hero.get('strength')}`) // 18
console.log(`  Armor: ${hero.get('armor')}`)       // 17
console.log(`  Speed: ${hero.get('speed')}`)       // 45

// End of round
const expired = hero.tick()
console.log(`Expired: ${expired.join(', ')}`) // 'dash'

console.log('Round 2:')
console.log(`  Speed: ${hero.get('speed')}`) // 30 (dash expired)
console.log(`  Rage remaining: ${hero.getRemainingDuration('strength', 'rage')}`) // 2
```

## Variations

### Percentage Buff (Multiply Modifier)

```typescript
import { createStatBlock } from '@motioneffector/stats'

const stats = createStatBlock({
  damage: { base: 20 }
})

// 50% damage increase
stats.addModifier('damage', {
  value: 1.5,
  source: 'power-attack',
  type: 'multiply'
})

console.log(stats.get('damage')) // 30
```

### Stacking Multiple Flat Modifiers

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  attack: { base: 5 }
})

hero.addModifier('attack', { value: 2, source: 'bless' })
hero.addModifier('attack', { value: 1, source: 'bardic-inspiration' })
hero.addModifier('attack', { value: 3, source: 'magic-weapon' })

console.log(hero.get('attack')) // 11 (5 + 2 + 1 + 3)
```

### Replacing a Modifier (Same Source)

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 }
})

hero.addModifier('strength', { value: 2, source: 'enhancement' })
console.log(hero.get('strength')) // 16

// Adding with same source replaces
hero.addModifier('strength', { value: 4, source: 'enhancement' })
console.log(hero.get('strength')) // 18 (not 20)
```

### Clearing All Modifiers

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14 }
})

hero.addModifier('strength', { value: 2, source: 'buff1' })
hero.addModifier('strength', { value: 3, source: 'buff2' })

// Clear modifiers from one stat
hero.clearModifiers('strength')

// Or clear all modifiers from all stats
hero.clearModifiers()
```

## Troubleshooting

### Modifier Not Applying

**Symptom:** `get()` returns the base value even after adding a modifier.

**Cause:** The modifier might be on a different stat, or it was removed.

**Solution:** Check `getModifiers(statName)` to see active modifiers. Verify the stat name matches.

### Modifier Replaced Unexpectedly

**Symptom:** Adding a modifier removed an existing one.

**Cause:** Both modifiers have the same `source` name.

**Solution:** Use unique source names for each modifier. Sources like `'buff'` are too generic.

## See Also

- **[Modifiers](Concept-Modifiers)** — Conceptual overview
- **[Stat Blocks](Concept-Stat-Blocks)** — Understanding base vs effective values
- **[Stat Block API](API-Stat-Block)** — Full method reference
