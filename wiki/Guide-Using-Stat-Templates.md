# Using Stat Templates

Create reusable stat configurations for NPCs, monsters, or character classes. Templates define defaults that can be overridden per instance.

## Prerequisites

Before starting, you should:

- [Create a stat block](Your-First-Character)

## Overview

We'll cover:

1. Creating a template
2. Creating instances with defaults
3. Overriding specific stats
4. Using templates for game entities

## Step 1: Create a Template

Use `createStatTemplate()` with stat definitions:

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const goblinTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    health: { default: 7, min: 0 }
  }
})
```

Templates use `default` instead of `base` to indicate it's a starting value that can be overridden.

## Step 2: Create Instances

Call `create()` to get a stat block with the template's defaults:

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const goblinTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    health: { default: 7, min: 0 }
  }
})

const goblin1 = goblinTemplate.create()
const goblin2 = goblinTemplate.create()

console.log(goblin1.get('health')) // 7
console.log(goblin2.get('health')) // 7

// They're independent
goblin1.modify('health', -5)
console.log(goblin1.get('health')) // 2
console.log(goblin2.get('health')) // 7
```

Each call to `create()` returns a fresh, independent stat block.

## Step 3: Override Stats

Pass an object to `create()` to override specific defaults:

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const goblinTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    health: { default: 7, min: 0 }
  }
})

// Regular goblin
const goblin = goblinTemplate.create()

// Goblin boss with more health and strength
const goblinBoss = goblinTemplate.create({
  strength: 12,
  health: 21
})

console.log(goblin.get('health'))     // 7
console.log(goblinBoss.get('health')) // 21
console.log(goblinBoss.get('strength')) // 12
console.log(goblinBoss.get('dexterity')) // 14 (default)
```

## Step 4: Use Template Options

Templates can include stat block options like `modifierFormula`:

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const characterTemplate = createStatTemplate({
  stats: {
    strength: { default: 10, min: 1, max: 20 },
    dexterity: { default: 10, min: 1, max: 20 }
  },
  options: {
    modifierFormula: (value) => Math.floor((value - 10) / 2),
    historyLimit: 50
  }
})

const hero = characterTemplate.create({ strength: 16 })
```

## Complete Example

```typescript
import { createStatTemplate, check } from '@motioneffector/stats'

// Define monster templates
const goblinTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    constitution: { default: 10, min: 1, max: 20 },
    health: { default: 7, min: 0 },
    armorClass: { default: 15 }
  }
})

const orcTemplate = createStatTemplate({
  stats: {
    strength: { default: 16, min: 1, max: 20 },
    dexterity: { default: 12, min: 1, max: 20 },
    constitution: { default: 16, min: 1, max: 20 },
    health: { default: 15, min: 0 },
    armorClass: { default: 13 }
  }
})

// Spawn an encounter
const encounter = [
  goblinTemplate.create(),
  goblinTemplate.create(),
  goblinTemplate.create({ health: 14 }), // Tougher goblin
  orcTemplate.create()
]

// Check if each enemy notices the party
for (const [index, enemy] of encounter.entries()) {
  const perception = check(enemy, 'dexterity', { difficulty: 12 })
  console.log(`Enemy ${index + 1}: ${perception.success ? 'Alert!' : 'Unaware'}`)
}
```

## Variations

### Character Class Templates

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const fighterTemplate = createStatTemplate({
  stats: {
    strength: { default: 16, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    constitution: { default: 14, min: 1, max: 20 },
    intelligence: { default: 10, min: 1, max: 20 },
    wisdom: { default: 10, min: 1, max: 20 },
    charisma: { default: 10, min: 1, max: 20 },
    health: { default: 12, min: 0 },
    level: { default: 1 }
  }
})

const wizardTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    dexterity: { default: 14, min: 1, max: 20 },
    constitution: { default: 12, min: 1, max: 20 },
    intelligence: { default: 16, min: 1, max: 20 },
    wisdom: { default: 12, min: 1, max: 20 },
    charisma: { default: 10, min: 1, max: 20 },
    health: { default: 6, min: 0 },
    level: { default: 1 }
  }
})

// Player picks a class
const player = fighterTemplate.create({ strength: 18 })
```

### Item Templates

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const weaponTemplate = createStatTemplate({
  stats: {
    damage: { default: 6 },
    weight: { default: 3 },
    durability: { default: 100, min: 0, max: 100 }
  }
})

const sword = weaponTemplate.create()
const greatsword = weaponTemplate.create({ damage: 12, weight: 6 })
```

### Factory Functions with Templates

```typescript
import { createStatTemplate, createDerivedStat } from '@motioneffector/stats'

const baseCharacterTemplate = createStatTemplate({
  stats: {
    strength: { default: 10, min: 1, max: 20 }
  }
})

function createCharacter(overrides?: Record<string, number>) {
  const character = baseCharacterTemplate.create(overrides)

  // Add derived stats
  createDerivedStat(character, 'carryCapacity', (s) => s.get('strength')! * 15)

  return character
}

const hero = createCharacter({ strength: 16 })
console.log(hero.get('carryCapacity')) // 240
```

## Troubleshooting

### Unknown Override Warning

**Symptom:** Console warning about unknown stat in override.

**Cause:** You passed an override for a stat not in the template.

**Solution:** Check spelling. Only stats defined in the template can be overridden.

### Templates Sharing State

**Symptom:** Changing one instance affects another.

**Cause:** This shouldn't happen—each `create()` returns an independent stat block.

**Solution:** Verify you're calling `create()` for each instance, not reusing the same stat block.

## See Also

- **[Stat Blocks](Concept-Stat-Blocks)** — Understanding stat blocks
- **[Saving and Loading State](Guide-Saving-And-Loading-State)** — Persisting template instances
- **[Utilities API](API-Utilities)** — `createStatTemplate` reference
