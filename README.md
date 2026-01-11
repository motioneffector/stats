# @motioneffector/stats

A TypeScript library for RPG-style statistics, dice rolling, and stat checks.

## Overview

This library provides tools for defining character/entity statistics, rolling dice, and performing stat checks with modifiers. It's designed for games, simulations, or any application needing randomized outcomes based on numeric attributes.

## Features

- **Stat Definitions**: Define stats with base values, min/max bounds, and modifiers
- **Dice Rolling**: Standard dice notation (1d20, 2d6+3, etc.)
- **Stat Checks**: Roll against stats with difficulty thresholds
- **Modifiers**: Temporary and permanent stat modifications
- **Derived Stats**: Stats calculated from other stats
- **Roll History**: Track roll results for auditing/display
- **Type Safety**: Full TypeScript support

## Core Concepts

### Stat Blocks

Define a collection of stats for an entity:

```typescript
const characterStats = createStatBlock({
  strength: { base: 14, min: 1, max: 20 },
  dexterity: { base: 12, min: 1, max: 20 },
  intelligence: { base: 10, min: 1, max: 20 },
  health: { base: 100, min: 0, max: 100 },
  armor: { base: 5, min: 0 }
})
```

### Dice Notation

Standard RPG dice notation:

```typescript
roll('1d20')        // Roll one 20-sided die
roll('2d6')         // Roll two 6-sided dice, sum them
roll('1d20+5')      // Roll d20, add 5
roll('4d6kh3')      // Roll 4d6, keep highest 3 (D&D stat rolling)
roll('2d10!')       // Exploding dice (reroll and add on max)
```

### Stat Checks

Perform checks against stats:

```typescript
// Simple check: roll 1d20 + stat modifier vs difficulty
const result = check(characterStats, 'strength', { difficulty: 15 })
// { success: true, roll: 17, modifier: 2, total: 19, difficulty: 15 }

// Custom dice
const result = check(characterStats, 'dexterity', {
  difficulty: 12,
  dice: '2d6'
})
```

### Modifiers

Apply temporary or permanent modifiers:

```typescript
// Temporary buff
characterStats.addModifier('strength', {
  value: 2,
  source: 'rage_spell',
  duration: 'temporary'
})

// Equipment bonus
characterStats.addModifier('armor', {
  value: 5,
  source: 'chainmail',
  duration: 'permanent'
})

// Get effective value (base + all modifiers)
characterStats.get('strength')  // 16 (14 base + 2 from rage)

// Remove modifier
characterStats.removeModifier('strength', 'rage_spell')
```

## API

### `createStatBlock(definitions)`

Creates a stat block with the given stat definitions.

### `statBlock.get(statName)`

Get the effective value of a stat (base + modifiers).

### `statBlock.getBase(statName)`

Get the base value of a stat (ignoring modifiers).

### `statBlock.set(statName, value)`

Set the base value of a stat.

### `statBlock.modify(statName, delta)`

Adjust a stat's base value by a delta.

### `statBlock.addModifier(statName, modifier)`

Add a modifier to a stat.

### `statBlock.removeModifier(statName, source)`

Remove a modifier by its source identifier.

### `statBlock.clearModifiers(statName?)`

Clear all modifiers (or just for one stat).

### `roll(notation)`

Roll dice using standard notation.

**Returns:** `{ total: number, rolls: number[], notation: string }`

### `check(statBlock, statName, options)`

Perform a stat check.

**Options:**
- `difficulty`: Target number to meet or exceed
- `dice`: Dice notation (default: `'1d20'`)
- `advantage`: Roll twice, take higher
- `disadvantage`: Roll twice, take lower

**Returns:** `{ success: boolean, roll: number, modifier: number, total: number, difficulty: number }`

### `createDerivedStat(statBlock, formula)`

Create a stat that derives from others:

```typescript
const carryCapacity = createDerivedStat(stats, (s) => s.get('strength') * 10)
```

## Dice Notation Reference

| Notation | Meaning |
|----------|---------|
| `NdX` | Roll N dice with X sides |
| `NdX+M` | Roll and add modifier M |
| `NdX-M` | Roll and subtract modifier M |
| `NdXkhY` | Keep highest Y rolls |
| `NdXklY` | Keep lowest Y rolls |
| `NdX!` | Exploding (reroll max, add) |
| `NdXr<Y` | Reroll values less than Y |

## Use Cases

- Tabletop RPG digital tools
- Video games with stat-based mechanics
- Roguelikes and procedural games
- Simulations with randomized outcomes
- Any application needing dice mechanics

## Example: Combat System

```typescript
const attacker = createStatBlock({
  strength: { base: 16 },
  attackBonus: { base: 4 }
})

const defender = createStatBlock({
  armorClass: { base: 15 },
  health: { base: 50 }
})

// Attack roll
const attackResult = check(attacker, 'attackBonus', {
  difficulty: defender.get('armorClass')
})

if (attackResult.success) {
  // Damage roll
  const damage = roll('1d8+' + Math.floor((attacker.get('strength') - 10) / 2))
  defender.modify('health', -damage.total)
  console.log(`Hit for ${damage.total} damage!`)
} else {
  console.log('Miss!')
}
```

## Design Philosophy

This library provides the mechanical building blocks for stat-based systems without imposing a specific game design. You define what stats exist, how checks work, and what the outcomes mean. The library handles the math and randomization.

## Installation

```bash
npm install @motioneffector/stats
```

## License

MIT
