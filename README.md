# @motioneffector/stats

A TypeScript library for RPG stat management with D&D 5e-style mechanics, dice rolling, and stat checks.

[![npm version](https://img.shields.io/npm/v/@motioneffector/stats.svg)](https://www.npmjs.com/package/@motioneffector/stats)
[![license](https://img.shields.io/npm/l/@motioneffector/stats.svg)](https://github.com/motioneffector/stats/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/stats/)**

## Features

- **Flexible Dice Rolling** - Full notation parser with advantage, keep/drop, exploding, and rerolls
- **Stat Management** - Define stats with bounds, modifiers, and automatic calculations
- **D&D 5e-Style Checks** - Advantage/disadvantage, custom dice, and bonuses
- **Derived Stats** - Auto-updating computed stats based on dependencies
- **Duration System** - Temporary and permanent modifiers with expiration
- **Roll History** - Track all rolls for audit trails
- **Stat Templates** - Create reusable stat block configurations
- **Serialization** - Save and restore complete stat block state

[Read the full manual →](https://motioneffector.github.io/stats/manual/)

## Quick Start

```typescript
import { createStatBlock, roll, check } from '@motioneffector/stats'

// Create a character with stats
const hero = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  health: { base: 45, min: 0, max: 100 }
})

// Roll dice with full notation support
const damage = roll('2d6+3')  // { total: 11, rolls: [4, 4], modifier: 3 }

// Make a strength check with D&D 5e mechanics
const result = check(hero, 'strength', { difficulty: 15 })
// { success: true, roll: 14, modifier: 3, total: 17 }
```

## Testing & Validation

- **Comprehensive test suite** - 367 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
