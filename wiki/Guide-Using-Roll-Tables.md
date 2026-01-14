# Using Roll Tables

Select random outcomes with weighted probabilities. Use roll tables for loot drops, random encounters, or any weighted random selection.

## Prerequisites

None—roll tables are standalone utilities.

## Overview

We'll cover:

1. Creating a weighted table
2. Rolling on the table
3. Using different weight distributions
4. Handling complex results

## Step 1: Define a Table

Create an array of entries with `weight` and `value`:

```typescript
const lootTable = [
  { weight: 10, value: 'gold' },
  { weight: 5, value: 'potion' },
  { weight: 1, value: 'rare sword' }
]
```

Higher weights mean higher probability. With these weights:
- Gold: 10/16 = 62.5% chance
- Potion: 5/16 = 31.25% chance
- Rare sword: 1/16 = 6.25% chance

## Step 2: Roll on the Table

Use `rollTable()` to select a random entry:

```typescript
import { rollTable } from '@motioneffector/stats'

const lootTable = [
  { weight: 10, value: 'gold' },
  { weight: 5, value: 'potion' },
  { weight: 1, value: 'rare sword' }
]

const loot = rollTable(lootTable)
console.log(`Found: ${loot}`) // e.g., "Found: gold"
```

The function returns the `value` of the selected entry.

## Step 3: Use Any Value Type

Values can be any type—strings, numbers, objects, or functions:

```typescript
import { rollTable } from '@motioneffector/stats'

// Objects
const encounterTable = [
  { weight: 5, value: { type: 'goblin', count: 3 } },
  { weight: 3, value: { type: 'orc', count: 1 } },
  { weight: 1, value: { type: 'dragon', count: 1 } }
]

const encounter = rollTable(encounterTable)
console.log(`${encounter.count} ${encounter.type}(s) appear!`)

// Numbers
const damageTable = [
  { weight: 1, value: 6 },  // Low damage
  { weight: 2, value: 8 },  // Medium
  { weight: 1, value: 12 }  // High damage
]

const damage = rollTable(damageTable)
console.log(`Dealt ${damage} damage`)
```

## Complete Example

```typescript
import { rollTable } from '@motioneffector/stats'

// Treasure table with typed objects
type Treasure = {
  name: string
  value: number
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

const treasureTable: Array<{ weight: number; value: Treasure }> = [
  { weight: 50, value: { name: 'Gold Coins', value: 10, rarity: 'common' } },
  { weight: 25, value: { name: 'Silver Ring', value: 25, rarity: 'common' } },
  { weight: 15, value: { name: 'Health Potion', value: 50, rarity: 'uncommon' } },
  { weight: 7, value: { name: 'Magic Scroll', value: 100, rarity: 'uncommon' } },
  { weight: 2, value: { name: 'Enchanted Dagger', value: 500, rarity: 'rare' } },
  { weight: 1, value: { name: 'Dragon Scale', value: 2000, rarity: 'legendary' } }
]

function openChest(): Treasure[] {
  const items: Treasure[] = []
  const itemCount = Math.floor(Math.random() * 3) + 1 // 1-3 items

  for (let i = 0; i < itemCount; i++) {
    items.push(rollTable(treasureTable))
  }

  return items
}

const loot = openChest()
console.log('You found:')
for (const item of loot) {
  console.log(`  [${item.rarity}] ${item.name} (${item.value}g)`)
}
```

## Variations

### Guaranteed Rare Drop

Stack tables for guaranteed + random drops:

```typescript
import { rollTable } from '@motioneffector/stats'

const commonTable = [
  { weight: 3, value: 'gold' },
  { weight: 2, value: 'potion' }
]

const rareTable = [
  { weight: 5, value: 'magic ring' },
  { weight: 3, value: 'enchanted sword' },
  { weight: 1, value: 'artifact' }
]

function bossLoot() {
  return {
    guaranteed: rollTable(rareTable), // Always get something rare
    bonus: rollTable(commonTable)     // Plus a common item
  }
}
```

### Nested Tables

Roll on one table to pick another table:

```typescript
import { rollTable } from '@motioneffector/stats'

const weaponTable = [
  { weight: 3, value: 'sword' },
  { weight: 2, value: 'axe' },
  { weight: 1, value: 'mace' }
]

const armorTable = [
  { weight: 3, value: 'leather' },
  { weight: 2, value: 'chain' },
  { weight: 1, value: 'plate' }
]

const categoryTable = [
  { weight: 1, value: weaponTable },
  { weight: 1, value: armorTable }
]

function randomEquipment() {
  const table = rollTable(categoryTable)
  return rollTable(table)
}

console.log(randomEquipment()) // e.g., "chain"
```

### Dynamic Weights

Calculate weights based on game state:

```typescript
import { rollTable } from '@motioneffector/stats'

function createLootTable(playerLevel: number) {
  return [
    { weight: 10, value: 'common item' },
    { weight: Math.max(1, 10 - playerLevel), value: 'gold' }, // Less gold at high levels
    { weight: Math.min(playerLevel, 10), value: 'rare item' } // More rares at high levels
  ]
}

const lowLevelTable = createLootTable(1)  // Mostly common + gold
const highLevelTable = createLootTable(10) // More rares

console.log(rollTable(lowLevelTable))
console.log(rollTable(highLevelTable))
```

### Equal Weights (Uniform Distribution)

For equal probability, use the same weight for all entries:

```typescript
import { rollTable } from '@motioneffector/stats'

const directions = [
  { weight: 1, value: 'north' },
  { weight: 1, value: 'south' },
  { weight: 1, value: 'east' },
  { weight: 1, value: 'west' }
]

const direction = rollTable(directions)
// Each direction has 25% chance
```

## Troubleshooting

### ValidationError: Table Empty

**Symptom:** `ValidationError: Roll table cannot be empty`

**Cause:** You passed an empty array.

**Solution:** Ensure the table has at least one entry.

### ValidationError: Negative Weight

**Symptom:** `ValidationError: Roll table weights cannot be negative`

**Cause:** An entry has a negative weight.

**Solution:** All weights must be >= 0.

### ValidationError: All Zero Weights

**Symptom:** `ValidationError: Roll table must have at least one non-zero weight`

**Cause:** All entries have weight 0.

**Solution:** At least one entry needs a positive weight.

## See Also

- **[Dice Notation](Concept-Dice-Notation)** — Rolling dice directly
- **[Utilities API](API-Utilities)** — `rollTable` reference
