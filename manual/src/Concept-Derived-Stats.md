# Derived Stats

Derived stats are computed from other stats. When a dependency changes, the derived stat automatically recalculates. Use them for values like carry capacity (based on strength), armor class (based on dexterity), or spell save DC (based on an ability score).

## How It Works

A derived stat is defined by a formula function that reads other stats. The library:

1. Tracks which stats the formula accesses
2. Recalculates the derived stat when those dependencies change
3. Fires change events so you can react to updates

Derived stats are **read-only**—you can't `set()` or `modify()` them directly. Their value comes entirely from the formula.

## Basic Usage

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

// Create a derived stat for carry capacity
createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

hero.get('carryCapacity') // 240 (16 × 15)

// Change strength, carry capacity updates automatically
hero.set('strength', 18)
hero.get('carryCapacity') // 270 (18 × 15)
```

The formula receives the stat block and can read any stats it needs.

## Key Points

- **Derived stats are read-only** — Calling `set()` or `addModifier()` on them throws an error.
- **Circular dependencies are detected** — If stat A depends on B and B depends on A, you get a `CircularDependencyError`.
- **Derived stats don't serialize** — `toJSON()` excludes them. Re-create them after loading.
- **Change events fire for derived stats** — Subscribe with `onChange()` or `onStat()`.

## Examples

### D&D Armor Class

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  dexterity: { base: 14 },
  baseArmor: { base: 10 }
})

createDerivedStat(hero, 'armorClass', (stats) => {
  const dexMod = Math.floor((stats.get('dexterity')! - 10) / 2)
  return stats.get('baseArmor')! + dexMod
})

hero.get('armorClass') // 12 (10 base + 2 dex mod)

// Equip better armor
hero.set('baseArmor', 14)
hero.get('armorClass') // 16 (14 base + 2 dex mod)
```

### Spell Save DC

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const wizard = createStatBlock({
  intelligence: { base: 18 },
  proficiencyBonus: { base: 3 }
})

createDerivedStat(wizard, 'spellSaveDC', (stats) => {
  const intMod = Math.floor((stats.get('intelligence')! - 10) / 2)
  return 8 + stats.get('proficiencyBonus')! + intMod
})

wizard.get('spellSaveDC') // 15 (8 + 3 + 4)
```

### Multiple Dependencies

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const character = createStatBlock({
  baseAttack: { base: 5 },
  strength: { base: 14 },
  enchantment: { base: 2 }
})

createDerivedStat(character, 'meleeAttack', (stats) => {
  const strMod = Math.floor((stats.get('strength')! - 10) / 2)
  return stats.get('baseAttack')! + strMod + stats.get('enchantment')!
})

character.get('meleeAttack') // 9 (5 + 2 + 2)

// Any dependency change updates the derived stat
character.set('enchantment', 3)
character.get('meleeAttack') // 10
```

### Listening for Changes

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 }
})

createDerivedStat(hero, 'carryCapacity', (stats) => {
  return stats.get('strength')! * 15
})

// Listen for changes to carry capacity
hero.onStat('carryCapacity', (event) => {
  console.log(`Carry capacity changed: ${event.oldValue} → ${event.newValue}`)
})

hero.set('strength', 18)
// Logs: "Carry capacity changed: 240 → 270"
```

## Circular Dependency Detection

The library detects circular dependencies when you create the derived stat:

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

const stats = createStatBlock({
  a: { base: 10 }
})

// This would create a circular dependency: b depends on itself
createDerivedStat(stats, 'b', (s) => s.get('b')! + 1)
// Throws: CircularDependencyError
```

## Related

- **[Stat Blocks](Concept-Stat-Blocks)** — The container that holds both regular and derived stats
- **[Using Derived Stats](Guide-Using-Derived-Stats)** — Step-by-step guide
- **[Checks API](API-Checks)** — Reference for `createDerivedStat`
