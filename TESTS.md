# @motioneffector/stats - Test Specification

Test-driven development specification for the RPG stats and dice library.

---

## 1. Dice Rolling - Basic

### `roll(notation)`

**Return type:**
```typescript
{
  total: number,        // Final sum after modifiers
  rolls: number[],      // Individual die results
  kept: number[],       // Which dice were kept (for kh/kl)
  notation: string,     // Original notation string
  modifier: number      // Sum of all numeric modifiers
}
```

**Basic rolling:**
```
✓ roll('1d6') returns total between 1-6
✓ roll('1d20') returns total between 1-20
✓ roll('2d6') returns total between 2-12
✓ roll('3d8') returns total between 3-24
✓ roll('1d1') always returns total of 1
✓ roll('10d10') returns total between 10-100
✓ roll('d20') without leading number returns total between 1-20 (implied 1)
✓ roll('d6') without leading number returns total between 1-6 (implied 1)
```

**Return object structure:**
```
✓ result.total equals sum of result.kept (or result.rolls if no keep/drop)
✓ result.rolls contains all individual die results
✓ result.rolls.length equals number of dice rolled
✓ result.kept equals result.rolls when no keep/drop modifiers
✓ result.notation echoes the input notation
✓ result.modifier is 0 when no numeric modifiers present
```

---

## 2. Dice Rolling - Numeric Modifiers

### Addition and Subtraction

```
✓ roll('1d20+5') adds 5 to total
✓ roll('1d20-3') subtracts 3 from total
✓ roll('2d6+10') adds 10 to sum of dice
✓ roll('1d20+0') works correctly (no change to total)
✓ roll('1d6-10') can result in negative total
✓ modifier is stored in result.modifier, not in result.rolls
✓ result.rolls contains only actual die values, unaffected by modifier
```

### Multiple Modifiers

```
✓ roll('1d20+5+3') sums modifiers: total = roll + 8
✓ roll('1d20+5-2') handles mixed modifiers: total = roll + 3
✓ roll('1d20-2-3') handles multiple subtractions: total = roll - 5
✓ roll('1d20+10-5+2-1') handles complex chains: total = roll + 6
✓ result.modifier reflects the sum of all numeric modifiers
```

---

## 3. Dice Rolling - Keep/Drop

### Keep Highest (kh)

```
✓ roll('4d6kh3') keeps highest 3 of 4 rolls
✓ roll('2d20kh1') keeps highest 1 (advantage roll)
✓ roll('5d6kh2') keeps highest 2 of 5 rolls
✓ result.rolls contains all 4 original rolls
✓ result.kept contains only the 3 highest values
✓ result.total equals sum of result.kept
```

### Keep Lowest (kl)

```
✓ roll('4d6kl3') keeps lowest 3 of 4 rolls
✓ roll('2d20kl1') keeps lowest 1 (disadvantage roll)
✓ roll('5d6kl2') keeps lowest 2 of 5 rolls
✓ result.kept contains only the lowest values
```

### Drop Highest (dh)

```
✓ roll('4d6dh1') drops highest 1, equivalent to kl3
✓ roll('5d6dh2') drops highest 2, keeps lowest 3
✓ result.kept excludes the dropped dice
```

### Drop Lowest (dl)

```
✓ roll('4d6dl1') drops lowest 1, equivalent to kh3
✓ roll('5d6dl2') drops lowest 2, keeps highest 3
```

### Edge Cases for Keep/Drop

```
✓ roll('2d6kh5') clamps to actual dice count (keeps all 2)
✓ roll('3d6kh10') clamps to actual dice count (keeps all 3)
✓ roll('4d6kl0') keeps none, total is 0
✓ roll('4d6kh0') keeps none, total is 0
✓ roll('2d6dh5') drops all, total is 0
✓ result.kept is empty array when all dice dropped
```

---

## 4. Dice Rolling - Exploding Dice

### Basic Exploding

```
✓ roll('1d6!') rerolls and adds when rolling max value (6)
✓ roll('1d20!') rerolls and adds when rolling 20
✓ exploding can chain: rolling 6, then 6, then 3 = total of 15
✓ result.rolls includes all rolls including explosions
✓ result.rolls.length can exceed original dice count due to explosions
```

### Explosion Limits

```
✓ explosions have a maximum chain depth of 100 (prevent infinite loops)
✓ after hitting limit, stops exploding and returns current total
✓ result includes all rolls up to the limit
```

### Exploding with Other Modifiers

```
✓ roll('1d6!+3') adds modifier after all explosions resolved
✓ roll('2d6!') each die can explode independently
✓ roll('4d6!kh3') exploding happens before keep/drop selection
```

---

## 5. Dice Rolling - Reroll

### Basic Reroll Syntax

```
✓ roll('1d6r1') rerolls ones (shorthand for r=1)
✓ roll('1d6r=1') rerolls exactly 1
✓ roll('1d6r=6') rerolls exactly 6
✓ roll('2d6r1') rerolls ones on each die independently
```

### Comparison Operators

```
✓ roll('1d6r<3') rerolls values less than 3 (rerolls 1 and 2)
✓ roll('1d6r<=3') rerolls values less than or equal to 3 (rerolls 1, 2, 3)
✓ roll('1d6r>4') rerolls values greater than 4 (rerolls 5 and 6)
✓ roll('1d6r>=4') rerolls values greater than or equal to 4 (rerolls 4, 5, 6)
```

### Reroll Behavior

```
✓ reroll happens exactly once per die (no infinite loops)
✓ second result stands even if it matches reroll condition
✓ roll('1d6r<3') that rerolls a 2 and gets a 1 keeps the 1
✓ result.rolls includes both original and rerolled values
```

### Multiple Reroll Conditions

```
✓ roll('1d6r1r2') rerolls both 1s and 2s
✓ roll('1d6r<2r>5') rerolls 1s and 6s
✓ multiple conditions checked independently, still only one reroll per die
```

---

## 6. Dice Rolling - Combined Modifiers

### Keep/Drop with Numeric Modifiers

```
✓ roll('4d6kh3+2') keeps highest 3, then adds 2
✓ roll('2d20kh1+5') advantage with +5 modifier
✓ roll('4d6dl1-2') drops lowest, then subtracts 2
```

### Exploding with Keep/Drop

```
✓ roll('4d6!kh3') exploding resolves first, then keep highest 3
✓ result.rolls may have more than 4 entries due to explosions
✓ result.kept has exactly 3 entries (highest values)
```

### Exploding with Reroll

```
✓ roll('1d6!r1') order: roll → explode → reroll
✓ explosions happen on max value, then reroll conditions checked
✓ roll('2d6!r<3') each die explodes and rerolls independently
```

### Complex Combinations

```
✓ roll('4d6!kh3+2') explode, keep highest 3, add 2
✓ roll('4d6r1kh3') reroll 1s, then keep highest 3
✓ roll('2d20kh1+5-2') advantage with net +3 modifier
```

---

## 7. Dice Rolling - Parsing Edge Cases

### Valid Notation Variations

```
✓ roll('1D20') uppercase D is valid, case insensitive
✓ roll('1d20') lowercase d is valid
✓ roll('1D6KH3') all uppercase is valid
✓ roll(' 1d20 ') leading/trailing whitespace is ignored
✓ roll('1d20 + 5') spaces around operators are ignored
✓ roll('1d20+ 5') space after operator is ignored
✓ roll('1d20 +5') space before operator is ignored
✓ roll('  2d6  +  3  ') multiple spaces throughout are ignored
```

### Invalid Notation

```
✓ roll('abc') throws ParseError with descriptive message
✓ roll('0d6') throws ParseError: cannot roll zero dice
✓ roll('1d0') throws ParseError: die must have at least 1 side
✓ roll('-1d6') throws ParseError: cannot roll negative dice
✓ roll('1d-6') throws ParseError: die cannot have negative sides
✓ roll('') throws ParseError: empty notation
✓ roll('d') throws ParseError: incomplete notation
✓ roll('1d') throws ParseError: missing die size
✓ roll('1d20+') throws ParseError: incomplete modifier
✓ roll('1d20+2.5') throws ParseError: modifiers must be integers
✓ roll('1d20.5') throws ParseError: die size must be integer
✓ roll('1.5d20') throws ParseError: dice count must be integer
✓ roll('1d20++5') throws ParseError: invalid modifier syntax
✓ roll('1d20+-5') throws ParseError: invalid modifier syntax
```

### Large Numbers

```
✓ roll('100d100') handles large dice pools
✓ roll('1d1000') handles large die size
✓ roll('1d20+1000000') handles large modifiers
✓ performance: 100d100 completes in under 100ms
```

---

## 8. Stat Block Creation

### `createStatBlock(definitions, options?)`

**Basic creation:**
```
✓ createStatBlock({}) creates empty stat block
✓ createStatBlock({ strength: { base: 10 } }) creates stat with base value
✓ createStatBlock({ a: { base: 1 }, b: { base: 2 } }) creates multiple stats
✓ each stat is independent
```

**Stat definition options:**
```typescript
{
  base: number,       // Required: initial value
  min?: number,       // Optional: minimum bound for base value
  max?: number        // Optional: maximum bound for base value
}
```

```
✓ { base: 14 } sets initial value to 14, no bounds
✓ { base: 100, min: 0, max: 100 } enforces bounds on base value
✓ { base: 50, min: 0 } has floor but no ceiling
✓ { base: 50, max: 100 } has ceiling but no floor
✓ { base: -5, min: 0 } clamps initial base to min (becomes 0)
✓ { base: 150, max: 100 } clamps initial base to max (becomes 100)
✓ { base: 50, min: 100, max: 10 } throws ValidationError: min > max
```

**Stat block options:**
```typescript
createStatBlock(definitions, {
  historyLimit?: number,           // Max rolls to keep (default: 100)
  modifierFormula?: (value: number) => number  // Custom modifier calculation
})
```

```
✓ default historyLimit is 100
✓ { historyLimit: 50 } limits roll history to 50 entries
✓ { historyLimit: 0 } disables roll history
✓ { modifierFormula: (v) => v } uses custom formula for checks
✓ modifierFormula receives effective stat value
```

---

## 9. Stat Access

### `statBlock.get(statName)`

```
✓ returns effective value (base + all modifiers applied)
✓ returns base value when no modifiers present
✓ returns undefined for non-existent stat
✓ does not throw for non-existent stat
```

### `statBlock.getBase(statName)`

```
✓ returns base value ignoring all modifiers
✓ returns undefined for non-existent stat
✓ base value is unaffected by modifiers
```

### `statBlock.set(statName, value)`

```
✓ sets base value to new value
✓ returns the new base value
✓ clamps to min if value below minimum
✓ clamps to max if value above maximum
✓ throws TypeError for non-existent stat
✓ error message includes stat name for debugging
```

### `statBlock.modify(statName, delta)`

```
✓ adjusts base by positive delta
✓ adjusts base by negative delta
✓ modify('stat', 0) is no-op but valid
✓ clamps result to min bound
✓ clamps result to max bound
✓ returns new base value after clamping
✓ throws TypeError for non-existent stat
```

### `statBlock.has(statName)`

```
✓ returns true if stat exists
✓ returns false if stat does not exist
```

### `statBlock.stats()`

```
✓ returns array of all stat names
✓ returns empty array for empty stat block
```

---

## 10. Stat Modifiers - Basic

### `statBlock.addModifier(statName, modifier)`

**Modifier structure:**
```typescript
{
  value: number,                    // Bonus/penalty amount
  source: string,                   // Unique identifier for removal
  type?: 'flat' | 'multiply',       // How modifier applies (default: 'flat')
  duration?: 'permanent' | 'temporary' | number  // When it expires (default: 'permanent')
}
```

**Basic modifier behavior:**
```
✓ adds modifier to specified stat
✓ modifier affects get() return value
✓ modifier does not affect getBase() return value
✓ returns the modifier object that was added
✓ throws TypeError for non-existent stat
```

**Flat modifiers (default):**
```
✓ { value: 5, source: 'buff' } adds 5 to effective value
✓ { value: -3, source: 'debuff' } subtracts 3 from effective value
✓ { value: 0, source: 'null' } has no effect but is valid
✓ type defaults to 'flat' when not specified
```

**Multiply modifiers:**
```
✓ { value: 2, type: 'multiply', source: 'double' } doubles effective value
✓ { value: 0.5, type: 'multiply', source: 'half' } halves effective value
✓ { value: 1, type: 'multiply', source: 'identity' } has no effect
✓ { value: 0, type: 'multiply', source: 'zero' } reduces to zero
✓ { value: -1, type: 'multiply', source: 'negate' } negates the value
```

**Multiple modifiers stacking:**
```
✓ multiple flat modifiers sum: base 10 + flat 5 + flat 3 = 18
✓ multiple multiply modifiers chain: (base * 2) * 1.5
✓ flat applies before multiply: (base + flats) * mult1 * mult2
✓ order of multipliers is order added
```

**Order of operations example:**
```
Base: 10
Add flat +5 (source: 'str_bonus')
Add flat +3 (source: 'item_bonus')
Add multiply x2 (source: 'giant_strength')
Add multiply x1.5 (source: 'rage')

Calculation: (10 + 5 + 3) * 2 * 1.5 = 18 * 2 * 1.5 = 54
```

```
✓ base=10, flat +5, flat +3, mult x2, mult x1.5 equals 54
✓ changing order of multipliers changes result
✓ changing order of flats does not change result
```

---

## 11. Stat Modifiers - Duration

### Permanent Modifiers

```
✓ { duration: 'permanent', ... } never expires
✓ permanent is the default when duration not specified
✓ permanent modifiers survive tick() calls
✓ permanent modifiers must be manually removed
```

### Temporary Modifiers

```
✓ { duration: 'temporary', ... } expires after 1 tick (default)
✓ { duration: 1, ... } expires after 1 tick
✓ { duration: 3, ... } expires after 3 ticks
✓ { duration: 0, ... } expires immediately on next tick
```

### `statBlock.tick()`

```
✓ decrements remaining duration on all temporary modifiers
✓ removes modifiers when duration reaches 0
✓ does not affect permanent modifiers
✓ returns array of expired modifier sources
✓ fires onChange events for each removed modifier
```

**Tick example:**
```typescript
statBlock.addModifier('strength', { value: 2, duration: 3, source: 'buff' })
statBlock.get('strength')  // base + 2
statBlock.tick()           // 2 remaining, returns []
statBlock.tick()           // 1 remaining, returns []
statBlock.tick()           // 0 remaining, removed, returns ['buff']
statBlock.get('strength')  // base (modifier gone)
```

```
✓ modifier with duration 3 survives 2 ticks
✓ modifier with duration 3 is removed on 3rd tick
✓ tick() returns ['buff'] when buff expires
✓ tick() returns [] when nothing expires
✓ multiple modifiers can expire on same tick
```

### `statBlock.getRemainingDuration(statName, source)`

```
✓ returns remaining ticks for temporary modifier
✓ returns Infinity for permanent modifier
✓ returns undefined if modifier doesn't exist
```

---

## 12. Stat Modifiers - Management

### `statBlock.removeModifier(statName, source)`

```
✓ removes modifier matching source string
✓ get() reflects removal immediately
✓ returns true if modifier was found and removed
✓ returns false if source doesn't exist (no-op)
✓ does not throw for non-existent source
```

### `statBlock.getModifiers(statName)`

```
✓ returns array of active modifiers for stat
✓ returns empty array if no modifiers
✓ returns undefined if stat doesn't exist
✓ each modifier includes value, source, type, duration info
```

**Modifier info structure:**
```typescript
{
  value: number,
  source: string,
  type: 'flat' | 'multiply',
  duration: 'permanent' | number,  // remaining ticks or 'permanent'
}
```

### `statBlock.clearModifiers(statName?)`

```
✓ clearModifiers('strength') removes all modifiers from strength
✓ clearModifiers() removes all modifiers from all stats
✓ fires onChange events for affected stats
✓ returns number of modifiers removed
```

### Duplicate Source Behavior

```
✓ adding modifier with existing source replaces the old modifier
✓ replacement uses new value, type, and duration
✓ fires single onChange event (not remove + add)
```

**Replacement example:**
```typescript
statBlock.addModifier('str', { value: 2, duration: 3, source: 'buff' })
statBlock.addModifier('str', { value: 5, duration: 2, source: 'buff' })  // replaces
statBlock.getModifiers('str')  // [{ value: 5, duration: 2, source: 'buff' }]
```

```
✓ second addModifier with same source replaces first
✓ only one modifier with source 'buff' exists
✓ new duration resets the expiration
```

---

## 13. Stat Modifiers - Bounds Interaction

```
✓ modifier can push effective value below stat's min bound
✓ modifier can push effective value above stat's max bound
✓ get() returns actual effective value, not clamped
✓ bounds only enforced on base value via set() and modify()
```

**Example:**
```typescript
const stats = createStatBlock({
  health: { base: 50, min: 0, max: 100 }
})
stats.addModifier('health', { value: 60, source: 'buff' })
stats.get('health')  // 110 (exceeds max, but allowed for effective value)

stats.addModifier('health', { value: -200, source: 'curse' })
stats.get('health')  // -90 (below min, but allowed for effective value)
```

```
✓ health with max 100, base 50, flat +60 returns 110
✓ health with min 0, base 50, flat -100 returns -50
✓ base value remains within bounds even with modifiers
```

---

## 14. Stat Checks

### `check(statBlock, statName, options)`

**Options:**
```typescript
{
  difficulty: number,              // Target number to meet/exceed
  dice?: string,                   // Dice notation (default: '1d20')
  advantage?: boolean,             // Roll twice, keep higher
  disadvantage?: boolean,          // Roll twice, keep lower
  bonus?: number,                  // Additional flat bonus
  modifier?: number                // Override calculated modifier
}
```

**Return type:**
```typescript
{
  success: boolean,       // total >= difficulty
  roll: number,           // Raw dice result (highest/lowest if adv/disadv)
  rolls: number[],        // All dice rolled (for adv/disadv inspection)
  modifier: number,       // Stat-based modifier applied
  bonus: number,          // Additional bonus applied
  total: number,          // roll + modifier + bonus
  difficulty: number,     // Target number
  margin: number          // total - difficulty (positive = success margin)
}
```

**Basic checks:**
```
✓ rolls 1d20 by default
✓ calculates modifier as Math.floor((stat - 10) / 2)
✓ uses effective stat value (get()) for modifier calculation
✓ total = roll + modifier + bonus
✓ success = total >= difficulty
✓ margin = total - difficulty
```

**Modifier calculation examples:**
```
✓ stat 10 → modifier 0  ((10-10)/2 = 0)
✓ stat 14 → modifier +2 ((14-10)/2 = 2)
✓ stat 8 → modifier -1  ((8-10)/2 = -1, rounded down)
✓ stat 1 → modifier -5  ((1-10)/2 = -4.5 → -5)
✓ stat 20 → modifier +5 ((20-10)/2 = 5)
```

**Custom dice:**
```
✓ check(stats, 'str', { dice: '2d6', difficulty: 10 }) uses 2d6
✓ check(stats, 'str', { dice: '3d6', difficulty: 12 }) uses 3d6
```

**Bonus:**
```
✓ bonus adds to total: total = roll + modifier + bonus
✓ bonus: 0 has no effect
✓ bonus: -5 subtracts from total
✓ bonus is separate from modifier in result object
```

**Override modifier:**
```
✓ { modifier: 5 } uses 5 instead of calculated modifier
✓ { modifier: 0 } uses 0 regardless of stat value
✓ { modifier: -3 } can specify negative override
```

### Advantage and Disadvantage

```
✓ advantage: true rolls twice, uses higher roll
✓ disadvantage: true rolls twice, uses lower roll
✓ result.rolls contains both roll values
✓ result.roll is the selected value (higher or lower)
```

**Advantage + Disadvantage cancellation:**
```
✓ both advantage and disadvantage true → roll normally (single die)
✓ result.rolls has single entry when cancelled
✓ follows D&D 5e rules for cancellation
```

### Check with Non-Existent Stat

```
✓ throws TypeError when stat doesn't exist
✓ error message identifies the missing stat
```

### Check with Custom modifierFormula

```
✓ uses stat block's modifierFormula if defined
✓ per-check modifier override takes precedence over formula
```

---

## 15. Derived Stats

### `createDerivedStat(statBlock, name, formula)`

```
✓ creates a computed stat that derives from other stats
✓ read via statBlock.get(name)
✓ automatically recalculates when source stats change
✓ returns the derived stat accessor object
```

**Example:**
```typescript
const stats = createStatBlock({
  strength: { base: 16 },
  proficiency: { base: 2 }
})

createDerivedStat(stats, 'carryCapacity', (s) => s.get('strength') * 10)
createDerivedStat(stats, 'attackBonus', (s) =>
  Math.floor((s.get('strength') - 10) / 2) + s.get('proficiency')
)

stats.get('carryCapacity')  // 160
stats.get('attackBonus')    // 5 (3 + 2)
```

```
✓ carryCapacity equals strength * 10
✓ attackBonus equals str modifier + proficiency
✓ changing strength updates carryCapacity
✓ changing proficiency updates attackBonus
```

### Derived from Derived

```
✓ derived stat can depend on another derived stat
✓ chain updates correctly: A → B → C
```

### Read-Only Behavior

```
✓ set() on derived stat throws TypeError
✓ error message: "Cannot set derived stat 'statName'"
✓ modify() on derived stat throws TypeError
✓ addModifier() on derived stat throws TypeError
```

### Error Handling

```
✓ formula that throws returns 0
✓ error is logged to console.error
✓ other stats remain functional
✓ formula errors don't crash stat block
```

### Circular Dependency Detection

```
✓ A depends on B, B depends on A throws CircularDependencyError
✓ A → B → C → A throws CircularDependencyError
✓ error thrown at definition time, not access time
✓ error message shows the dependency cycle
```

### Derived Stat Listing

```
✓ statBlock.stats() includes derived stats
✓ statBlock.isDerived(name) returns true for derived stats
✓ statBlock.isDerived(name) returns false for regular stats
```

---

## 16. Stat Templates

### `createStatTemplate(config)`

**Config structure:**
```typescript
{
  stats: {
    [name: string]: {
      default: number,     // Default base value
      min?: number,
      max?: number
    }
  },
  options?: {
    historyLimit?: number,
    modifierFormula?: (value: number) => number
  }
}
```

```
✓ creates reusable template object
✓ template is immutable after creation
```

### `template.create(overrides?)`

```
✓ returns new independent stat block
✓ each create() returns separate instance
✓ uses default values from template
✓ overrides replace default base values
```

**Example:**
```typescript
const characterTemplate = createStatTemplate({
  stats: {
    strength: { default: 10, min: 1, max: 20 },
    dexterity: { default: 10, min: 1, max: 20 },
    health: { default: 100, min: 0 }
  }
})

const hero = characterTemplate.create({ strength: 16 })
const goblin = characterTemplate.create({ strength: 8, health: 30 })

hero.get('strength')    // 16
hero.get('dexterity')   // 10 (default)
goblin.get('health')    // 30
```

```
✓ hero.strength is 16 (overridden)
✓ hero.dexterity is 10 (default)
✓ goblin.health is 30 (overridden)
✓ modifying hero doesn't affect goblin
✓ modifying goblin doesn't affect hero
```

### Template Validation

```
✓ override value outside bounds is clamped
✓ override for non-existent stat is ignored with warning
✓ template options are applied to created stat blocks
```

---

## 17. Roll History

### `statBlock.getRollHistory(limit?)`

```
✓ returns array of roll history entries
✓ most recent rolls first (reverse chronological)
✓ limit parameter restricts number returned
✓ default returns all stored history
```

**History entry structure:**
```typescript
{
  notation: string,      // '1d20+5'
  result: number,        // Final total
  rolls: number[],       // Individual dice values
  timestamp: number,     // Date.now() when rolled
  stat?: string,         // Stat name if from a check
  context?: string       // Optional label
}
```

### History from roll()

```
✓ roll() automatically records to history
✓ standalone roll() has no stat field
✓ notation preserved exactly as called
```

### History from check()

```
✓ check() records roll to history
✓ stat field contains the stat name checked
✓ notation reflects dice used in check
```

### History Limit

```
✓ default limit is 100 entries
✓ oldest entries evicted when limit reached
✓ { historyLimit: 50 } keeps only 50 entries
✓ { historyLimit: 0 } disables history (getRollHistory returns [])
```

### `statBlock.clearRollHistory()`

```
✓ removes all roll history entries
✓ getRollHistory() returns [] after clear
```

### Context Labels

```
✓ roll('1d20', { context: 'initiative' }) stores context
✓ context field is undefined if not provided
✓ context can be any string
```

---

## 18. Events

### `statBlock.onChange(callback)`

**Callback signature:**
```typescript
(event: {
  stat: string,
  newValue: number,      // New effective value
  oldValue: number,      // Previous effective value
  baseChanged: boolean,  // Whether base value changed
  modifiersChanged: boolean  // Whether modifiers changed
}) => void
```

```
✓ fires when stat base value changes via set()
✓ fires when stat base value changes via modify()
✓ fires when modifier added
✓ fires when modifier removed
✓ fires when modifier expires via tick()
✓ does not fire when value unchanged
✓ returns unsubscribe function
```

### Multiple Callbacks

```
✓ multiple callbacks can be registered
✓ all callbacks fire for each change
✓ callbacks fire in registration order
✓ unsubscribe removes only that callback
```

### Callback Error Handling

```
✓ error in callback is caught and logged to console.error
✓ other callbacks still fire after error
✓ stat change completes despite callback error
✓ error includes stack trace in log
```

### `statBlock.onStat(statName, callback)`

```
✓ fires only for changes to specified stat
✓ callback receives same event object
✓ returns unsubscribe function
✓ throws TypeError for non-existent stat
```

### Derived Stat Events

```
✓ onChange fires when derived stat value changes
✓ event.stat is the derived stat name
✓ event.baseChanged is false (derived stats have no base)
```

### Batch Changes

```
✓ each individual change fires separate event
✓ no built-in batching mechanism
```

---

## 19. Serialization

### `statBlock.toJSON()`

**Return structure:**
```typescript
{
  version: 1,
  stats: {
    [name: string]: number  // Base values only
  },
  modifiers: {
    [statName: string]: Array<{
      value: number,
      source: string,
      type: 'flat' | 'multiply',
      duration: 'permanent' | number
    }>
  }
}
```

```
✓ returns plain object suitable for JSON.stringify()
✓ includes version field with value 1
✓ includes all base values in stats object
✓ includes all active modifiers
✓ does NOT include derived stats
✓ does NOT include stat definitions (min/max)
✓ does NOT include roll history
```

### `createStatBlock(definitions, { fromJSON: data })`

```
✓ restores base values from serialized data
✓ restores modifiers from serialized data
✓ validates against stat definitions
```

### Mismatch Handling

```
✓ unknown stat in JSON is ignored with console.warn
✓ missing stat in JSON uses definition's base value
✓ modifier for unknown stat is ignored with console.warn
```

### Version Handling

```
✓ version field required for fromJSON
✓ unsupported version throws VersionError
✓ version 1 is currently the only supported version
```

### Round-Trip

```
✓ statBlock.toJSON() → fromJSON produces equivalent stat block
✓ get() returns same values after round-trip
✓ modifiers preserved with correct duration
```

---

## 20. Utility Functions

### `rollTable(entries)`

**Entry structure:**
```typescript
{
  weight: number,   // Relative probability weight
  value: T          // The value to return if selected
}
```

```
✓ returns value from weighted random selection
✓ higher weight = higher probability
✓ weights are relative (1 and 2 same as 0.5 and 1)
```

**Edge cases:**
```
✓ single entry always returns that entry's value
✓ throws ValidationError for empty entries array
✓ throws ValidationError for all-zero weights
✓ throws ValidationError for negative weight
✓ accepts float weights (0.5, 1.5, etc.)
✓ weight 0 entry is never selected
```

**Statistical distribution:**
```
✓ over 1000 rolls, distribution approximates weights (within tolerance)
```

### `contest(a, b, options?)`

**Overload signatures:**
```typescript
contest(statBlockA, statNameA, statBlockB, statNameB, options?)
contest(modifierA, modifierB, options?)
```

**Options:**
```typescript
{
  dice?: string  // Default: '1d20'
}
```

**Return type:**
```typescript
{
  winner: 'a' | 'b' | 'tie',
  rolls: { a: number, b: number },
  totals: { a: number, b: number },  // roll + modifier
  margin: number                      // absolute difference
}
```

```
✓ both sides roll specified dice
✓ adds stat modifier to each side's roll
✓ higher total wins
✓ exact tie returns winner: 'tie'
✓ margin is absolute difference between totals
✓ default dice is 1d20
✓ custom dice via options.dice
```

**With stat blocks:**
```
✓ contest(heroStats, 'str', monsterStats, 'str') uses str modifiers
✓ modifier calculated using modifierFormula
```

**With raw modifiers:**
```
✓ contest(5, 3) compares with +5 vs +3 modifiers
```

### `saveThrow(statBlock, statName, difficulty)`

```
✓ simplified check that returns boolean only
✓ uses 1d20 + stat modifier
✓ returns true if roll + modifier >= difficulty
✓ returns false otherwise
✓ equivalent to check(...).success
```

---

## 21. Error Types

### ParseError
```
✓ thrown for invalid dice notation
✓ message describes the parsing issue
✓ includes the invalid notation string
```

### ValidationError
```
✓ thrown for invalid configuration
✓ thrown for invalid roll table
✓ thrown for min > max in stat definition
```

### TypeError
```
✓ thrown for operations on non-existent stats
✓ thrown for set() on derived stats
✓ message identifies the problematic stat name
```

### CircularDependencyError
```
✓ thrown when derived stat creates circular dependency
✓ message shows the cycle path
```

### VersionError
```
✓ thrown for unsupported serialization version
✓ message includes the unsupported version number
```

---

## 22. TypeScript Types

### Exported Types

```typescript
type StatDefinition = {
  base: number
  min?: number
  max?: number
}

type StatDefinitions = Record<string, StatDefinition>

type Modifier = {
  value: number
  source: string
  type?: 'flat' | 'multiply'
  duration?: 'permanent' | 'temporary' | number
}

type ModifierInfo = {
  value: number
  source: string
  type: 'flat' | 'multiply'
  duration: 'permanent' | number
}

type RollResult = {
  total: number
  rolls: number[]
  kept: number[]
  notation: string
  modifier: number
}

type CheckResult = {
  success: boolean
  roll: number
  rolls: number[]
  modifier: number
  bonus: number
  total: number
  difficulty: number
  margin: number
}

type CheckOptions = {
  difficulty: number
  dice?: string
  advantage?: boolean
  disadvantage?: boolean
  bonus?: number
  modifier?: number
}

type HistoryEntry = {
  notation: string
  result: number
  rolls: number[]
  timestamp: number
  stat?: string
  context?: string
}

type ContestResult = {
  winner: 'a' | 'b' | 'tie'
  rolls: { a: number; b: number }
  totals: { a: number; b: number }
  margin: number
}

type StatChangeEvent = {
  stat: string
  newValue: number
  oldValue: number
  baseChanged: boolean
  modifiersChanged: boolean
}
```

```
✓ all types are exported from package
✓ StatBlock type includes all methods
✓ generics work for custom stat names
```

---

## 23. Edge Cases - General

### Numeric Edge Cases

```
✓ stat value of 0 works correctly
✓ negative stat values work correctly
✓ very large stat values (Number.MAX_SAFE_INTEGER) work
✓ float base values are allowed
✓ float modifier values are allowed
✓ NaN stat value throws ValidationError
✓ Infinity stat value throws ValidationError
```

### String Edge Cases

```
✓ stat names can contain spaces
✓ stat names can contain unicode
✓ stat names can be numbers (as strings)
✓ empty string stat name throws ValidationError
✓ source names can contain any characters
✓ empty string source throws ValidationError
```

### Concurrency

```
✓ multiple rapid set() calls resolve correctly
✓ addModifier during tick() is safe
✓ removeModifier during onChange callback is safe
```

---

## Test Utilities

### Seeded Random

For deterministic tests:
```typescript
import { setSeed, resetSeed } from '@motioneffector/stats/testing'

setSeed(12345)
roll('1d20')  // Always same result with same seed
resetSeed()   // Return to true randomness
```

```
✓ setSeed makes rolls deterministic
✓ same seed produces same sequence
✓ resetSeed restores randomness
```

### Test Helpers

```typescript
import { createTestStatBlock } from '@motioneffector/stats/testing'

// Quick stat block for tests
const stats = createTestStatBlock({
  strength: 16,
  dexterity: 14
})
```

```
✓ createTestStatBlock creates stat block with simple syntax
✓ all values unbounded by default
```

### Statistical Validation

```typescript
import { validateDistribution } from '@motioneffector/stats/testing'

// Verify dice are fair
validateDistribution(() => roll('1d6').total, {
  expected: { 1: 1/6, 2: 1/6, 3: 1/6, 4: 1/6, 5: 1/6, 6: 1/6 },
  samples: 10000,
  tolerance: 0.02
})
```

```
✓ validateDistribution checks statistical fairness
✓ throws if distribution outside tolerance
✓ works for any roll function
```

---

## Implementation Checklist

Core exports from `@motioneffector/stats`:
- [ ] `roll(notation, options?)`
- [ ] `createStatBlock(definitions, options?)`
- [ ] `check(statBlock, statName, options)`
- [ ] `createDerivedStat(statBlock, name, formula)`
- [ ] `createStatTemplate(config)`
- [ ] `rollTable(entries)`
- [ ] `contest(...)`
- [ ] `saveThrow(statBlock, statName, difficulty)`

Testing exports from `@motioneffector/stats/testing`:
- [ ] `setSeed(seed)`
- [ ] `resetSeed()`
- [ ] `createTestStatBlock(values)`
- [ ] `validateDistribution(fn, config)`

Error exports:
- [ ] `ParseError`
- [ ] `ValidationError`
- [ ] `CircularDependencyError`
- [ ] `VersionError`
