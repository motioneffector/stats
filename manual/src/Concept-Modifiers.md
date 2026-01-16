# Modifiers

Modifiers are bonuses or penalties applied to stats on top of the base value. A strength buff, a poison debuff, or an equipment bonus—these are all modifiers. They stack, can expire over time, and are tracked separately from the base stat.

## How It Works

Each modifier has:

- **value**: The numeric bonus or penalty
- **source**: A unique name identifying where it came from (used to remove it later)
- **type**: Either `'flat'` (add to value) or `'multiply'` (scale the value)
- **duration**: How long it lasts—`'permanent'`, `'temporary'` (1 tick), or a number of ticks

When you call `get()` on a stat, the effective value is calculated:

```
Effective = (Base + Flat Modifiers) × Multiply Modifiers
```

Flat modifiers are summed first, then multiply modifiers are applied in order.

## Basic Usage

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14, min: 1, max: 20 }
})

// Add a +2 buff from a spell
hero.addModifier('strength', {
  value: 2,
  source: 'bull-strength-spell'
})

hero.get('strength') // 16 (14 base + 2 modifier)

// Remove the buff
hero.removeModifier('strength', 'bull-strength-spell')

hero.get('strength') // 14
```

The `source` string identifies the modifier. Use descriptive names like `'giant-belt'` or `'rage-bonus'`.

## Key Points

- **Source names must be unique per stat** — Adding a modifier with an existing source replaces it.
- **Flat modifiers add, multiply modifiers scale** — A `multiply` modifier of 1.5 increases the stat by 50%.
- **Modifiers can push past bounds** — A stat with max 20 and a +5 modifier can have an effective value of 25.
- **Use `tick()` to expire timed modifiers** — Each call decrements duration counters and removes expired modifiers.

## Duration Types

### Permanent

Lasts until explicitly removed:

```typescript
hero.addModifier('strength', {
  value: 2,
  source: 'magic-belt',
  duration: 'permanent'
})
// Stays until hero.removeModifier('strength', 'magic-belt')
```

### Temporary

Expires after one `tick()` call:

```typescript
hero.addModifier('strength', {
  value: 4,
  source: 'rage',
  duration: 'temporary'
})

hero.get('strength') // 18
hero.tick()
hero.get('strength') // 14 (rage expired)
```

### Numeric Duration

Expires after N `tick()` calls:

```typescript
hero.addModifier('strength', {
  value: 2,
  source: 'potion',
  duration: 3
})

hero.tick() // 2 ticks remaining
hero.tick() // 1 tick remaining
hero.tick() // Expires
```

## Modifier Types

### Flat Modifiers (default)

Add or subtract from the base:

```typescript
hero.addModifier('strength', {
  value: -4,
  source: 'poison',
  type: 'flat'
})
```

### Multiply Modifiers

Scale the total after flat modifiers:

```typescript
hero.addModifier('damage', {
  value: 2,
  source: 'critical-hit',
  type: 'multiply'
})
// If base + flat modifiers = 10, effective = 20
```

## Examples

### Equipment Bonus

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  armor: { base: 10 }
})

// Equip a shield
hero.addModifier('armor', {
  value: 2,
  source: 'shield'
})

// Equip magic armor
hero.addModifier('armor', {
  value: 3,
  source: 'chainmail'
})

hero.get('armor') // 15 (10 + 2 + 3)

// Unequip shield
hero.removeModifier('armor', 'shield')
hero.get('armor') // 13
```

### Buff That Lasts 3 Rounds

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  speed: { base: 30 }
})

hero.addModifier('speed', {
  value: 10,
  source: 'haste',
  duration: 3
})

hero.get('speed') // 40

// Simulate 3 rounds
hero.tick() // Round 1 ends
hero.tick() // Round 2 ends
hero.tick() // Round 3 ends, haste expires

hero.get('speed') // 30
```

### Percentage Damage Increase

```typescript
import { createStatBlock } from '@motioneffector/stats'

const stats = createStatBlock({
  damage: { base: 20 }
})

stats.addModifier('damage', {
  value: 1.5,
  source: 'berserker-rage',
  type: 'multiply'
})

stats.get('damage') // 30 (20 × 1.5)
```

## Related

- **[Stat Blocks](Concept-Stat-Blocks)** — The container that holds stats and modifiers
- **[Working with Modifiers](Guide-Working-With-Modifiers)** — Step-by-step guide
- **[Stat Block API](API-Stat-Block)** — Full method reference for `addModifier`, `removeModifier`, etc.
