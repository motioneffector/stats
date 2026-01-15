# Stat Blocks

A stat block is a container for numeric stats—like a character sheet. Each stat has a base value, optional bounds, and can have modifiers stacked on top. You use stat blocks to represent characters, monsters, items, or anything with numeric attributes.

## How It Works

Think of a stat block as a smart object that manages related numbers. Each stat has:

- **Base value**: The fundamental value before any modifiers
- **Min/Max bounds**: Optional limits that prevent the stat from going too low or high
- **Modifiers**: Bonuses or penalties applied on top of the base

When you read a stat with `get()`, you get the **effective value**—the base plus all active modifiers. When you write with `set()` or `modify()`, you change the **base value** only; modifiers remain separate.

```
Effective Value = Base + Flat Modifiers × Multiply Modifiers
```

## Basic Usage

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 14, min: 1, max: 20 },
  health: { base: 100, min: 0 }
})

// Read the effective value
hero.get('strength') // 14

// Change the base value
hero.set('strength', 16)
hero.get('strength') // 16

// Modify relative to current base
hero.modify('health', -25)
hero.get('health') // 75
```

The stat block enforces bounds automatically. Setting health to -50 when min is 0 results in 0.

## Key Points

- **`get()` returns effective value** — Base plus all modifiers. Use `getBase()` if you need just the base.
- **`set()` and `modify()` change the base** — Modifiers are managed separately with `addModifier()` and `removeModifier()`.
- **Bounds are enforced on the base** — If you set strength to 25 with max 20, the base becomes 20. Modifiers can push the effective value beyond bounds.
- **Stats are independent** — Changing one stat doesn't affect others (unless you set up [derived stats](Concept-Derived-Stats)).

## Examples

### Character with D&D-style ability scores

```typescript
import { createStatBlock } from '@motioneffector/stats'

const character = createStatBlock({
  strength: { base: 10, min: 1, max: 20 },
  dexterity: { base: 10, min: 1, max: 20 },
  constitution: { base: 10, min: 1, max: 20 },
  intelligence: { base: 10, min: 1, max: 20 },
  wisdom: { base: 10, min: 1, max: 20 },
  charisma: { base: 10, min: 1, max: 20 }
})
```

### Health pool with no upper limit

```typescript
import { createStatBlock } from '@motioneffector/stats'

const boss = createStatBlock({
  health: { base: 500, min: 0 }
  // No max means health can grow indefinitely
})

boss.modify('health', 100) // Heal for 100
boss.get('health') // 600
```

### Resource that can go negative (debt)

```typescript
import { createStatBlock } from '@motioneffector/stats'

const economy = createStatBlock({
  gold: { base: 100 }
  // No min or max—can go negative or arbitrarily high
})

economy.modify('gold', -150)
economy.get('gold') // -50 (in debt)
```

## Related

- **[Modifiers](Concept-Modifiers)** — Add temporary or permanent bonuses to stats
- **[Derived Stats](Concept-Derived-Stats)** — Create stats that auto-compute from others
- **[Working with Modifiers](Guide-Working-With-Modifiers)** — Step-by-step guide to buffs and debuffs
- **[Stat Block API](API-Stat-Block)** — Full method reference
