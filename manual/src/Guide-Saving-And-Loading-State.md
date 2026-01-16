# Saving and Loading State

Persist stat block state to JSON and restore it later. Save games, sync to a server, or store in a database.

## Prerequisites

Before starting, you should:

- [Create a stat block](Your-First-Character)

## Overview

We'll cover:

1. Serializing with toJSON()
2. Storing the data
3. Restoring with fromJSON
4. Understanding what's included

## Step 1: Serialize to JSON

Call `toJSON()` to get a serializable object:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 },
  health: { base: 100, min: 0 }
})

hero.modify('health', -25)
hero.addModifier('strength', { value: 2, source: 'belt', duration: 5 })

const data = hero.toJSON()
console.log(JSON.stringify(data, null, 2))
```

Output:

```json
{
  "version": 1,
  "stats": {
    "strength": 16,
    "health": 75
  },
  "modifiers": {
    "strength": [
      {
        "value": 2,
        "source": "belt",
        "type": "flat",
        "duration": 5
      }
    ]
  }
}
```

## Step 2: Store the Data

Store the JSON anywhere you'd store data:

```typescript
import { createStatBlock } from '@motioneffector/stats'

const hero = createStatBlock({
  strength: { base: 16 },
  health: { base: 100, min: 0 }
})

const data = hero.toJSON()

// localStorage
localStorage.setItem('hero', JSON.stringify(data))

// File (Node.js)
// fs.writeFileSync('save.json', JSON.stringify(data))

// Send to server
// await fetch('/api/save', { method: 'POST', body: JSON.stringify(data) })
```

## Step 3: Restore from JSON

Pass the saved data to `createStatBlock()` with the `fromJSON` option:

```typescript
import { createStatBlock } from '@motioneffector/stats'

// Load the saved data
const savedData = JSON.parse(localStorage.getItem('hero')!)

// Create stat block with same definitions
const hero = createStatBlock(
  {
    strength: { base: 16 },
    health: { base: 100, min: 0 }
  },
  { fromJSON: savedData }
)

console.log(hero.get('health'))    // 75 (restored)
console.log(hero.get('strength'))  // 18 (16 base + 2 modifier)
```

The definitions must match. The `fromJSON` data overrides base values and restores modifiers.

## Step 4: Understand What's Saved

**Included:**
- Base values for all stats
- All modifiers (value, source, type, remaining duration)
- Version number for future migrations

**Not included:**
- Derived stats (re-create them after loading)
- Event listeners (re-attach after loading)
- Roll history (starts fresh)
- Stat bounds (min/max) — these come from definitions

## Complete Example

```typescript
import { createStatBlock, createDerivedStat } from '@motioneffector/stats'

// Factory function to create a hero with derived stats
function createHero(savedData?: object) {
  const hero = createStatBlock(
    {
      strength: { base: 10, min: 1, max: 20 },
      health: { base: 100, min: 0 },
      level: { base: 1 }
    },
    savedData ? { fromJSON: savedData as any } : undefined
  )

  // Re-create derived stats (not saved)
  createDerivedStat(hero, 'carryCapacity', (s) => s.get('strength')! * 15)

  return hero
}

// New game
let hero = createHero()
hero.set('strength', 16)
hero.set('level', 5)
hero.modify('health', -30)
hero.addModifier('strength', { value: 2, source: 'belt' })

// Save
const saveData = hero.toJSON()
localStorage.setItem('save', JSON.stringify(saveData))

// Load (later, or in a different session)
const loadedData = JSON.parse(localStorage.getItem('save')!)
hero = createHero(loadedData)

console.log(hero.get('strength'))      // 18
console.log(hero.get('health'))        // 70
console.log(hero.get('level'))         // 5
console.log(hero.get('carryCapacity')) // 270
```

## Variations

### Saving Multiple Characters

```typescript
import { createStatBlock } from '@motioneffector/stats'

const party = {
  warrior: createStatBlock({ strength: { base: 16 } }),
  mage: createStatBlock({ intelligence: { base: 18 } })
}

// Save all
const saveData = {
  warrior: party.warrior.toJSON(),
  mage: party.mage.toJSON()
}
localStorage.setItem('party', JSON.stringify(saveData))

// Load all
const loaded = JSON.parse(localStorage.getItem('party')!)
const loadedParty = {
  warrior: createStatBlock({ strength: { base: 10 } }, { fromJSON: loaded.warrior }),
  mage: createStatBlock({ intelligence: { base: 10 } }, { fromJSON: loaded.mage })
}
```

### Handling Unknown Stats

If saved data contains stats not in your definitions, they're logged as warnings and ignored:

```typescript
import { createStatBlock } from '@motioneffector/stats'

// Old save has 'luck' stat, but we removed it
const oldSave = {
  version: 1,
  stats: { strength: 16, luck: 10 },
  modifiers: {}
}

const hero = createStatBlock(
  { strength: { base: 10 } }, // No 'luck' in definitions
  { fromJSON: oldSave }
)
// Console warning: "Unknown stat in JSON: luck"

console.log(hero.get('strength')) // 16
console.log(hero.get('luck'))     // undefined
```

### Version Checking

The saved data includes a version number for future migration support:

```typescript
const data = hero.toJSON()
console.log(data.version) // 1

// Future versions could check and migrate:
// if (data.version < 2) { migrateV1toV2(data) }
```

## Troubleshooting

### VersionError

**Symptom:** `VersionError: Unsupported version`

**Cause:** The saved data has a version number the library doesn't support.

**Solution:** This shouldn't happen with current versions. If you see this, the save file may be corrupted or from an incompatible version.

### Stats Not Restoring

**Symptom:** After loading, stats have wrong values.

**Cause:** The stat definitions don't match what was saved.

**Solution:** Ensure you use the same stat definitions when loading. The definitions provide bounds and structure; the saved data provides values.

## See Also

- **[Stat Blocks](Concept-Stat-Blocks)** — Understanding base values and modifiers
- **[Using Derived Stats](Guide-Using-Derived-Stats)** — Re-creating derived stats after load
- **[Stat Block API](API-Stat-Block)** — `toJSON` method reference
