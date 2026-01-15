# Errors

Error classes thrown by the library.

---

## `StatsError`

Base class for all library errors.

```typescript
class StatsError extends Error {
  name: 'StatsError'
}
```

All other errors extend this class.

---

## `ParseError`

Thrown when dice notation cannot be parsed.

```typescript
class ParseError extends StatsError {
  name: 'ParseError'
  notation?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `notation` | `string` | The invalid notation string |

**Thrown by:**
- `roll()` — When notation is invalid

**Common causes:**
- Invalid syntax: `"2d"`, `"d"`, `"abc"`
- Negative dice: `"-2d6"`, `"2d-6"`
- Zero dice: `"0d6"`
- Incomplete modifier: `"2d6+"`

**Example:**

```typescript
import { roll, ParseError } from '@motioneffector/stats'

try {
  roll('invalid')
} catch (error) {
  if (error instanceof ParseError) {
    console.log(`Invalid notation: ${error.notation}`)
  }
}
```

---

## `ValidationError`

Thrown when input validation fails.

```typescript
class ValidationError extends StatsError {
  name: 'ValidationError'
  field?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | The field that failed validation |

**Thrown by:**
- `createStatBlock()` — When min > max
- `rollTable()` — When table is empty or has invalid weights

**Common causes:**
- Stat definition has `min` greater than `max`
- Roll table is empty
- Roll table has negative weights
- Roll table has all zero weights

**Example:**

```typescript
import { createStatBlock, ValidationError } from '@motioneffector/stats'

try {
  createStatBlock({
    health: { base: 50, min: 100, max: 10 } // min > max
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed for: ${error.field}`)
  }
}
```

---

## `CircularDependencyError`

Thrown when derived stats create a circular dependency.

```typescript
class CircularDependencyError extends StatsError {
  name: 'CircularDependencyError'
  cycle?: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `cycle` | `string[]` | The stats involved in the cycle |

**Thrown by:**
- `createDerivedStat()` — When formula creates a cycle

**Common causes:**
- Derived stat references itself
- Two derived stats reference each other
- Chain of derived stats forms a loop

**Example:**

```typescript
import { createStatBlock, createDerivedStat, CircularDependencyError } from '@motioneffector/stats'

const stats = createStatBlock({ a: { base: 10 } })

try {
  // This creates a circular dependency
  createDerivedStat(stats, 'b', (s) => s.get('b')! + 1)
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log(`Cycle detected: ${error.cycle?.join(' → ')}`)
  }
}
```

---

## `VersionError`

Thrown when loading serialized data with an unsupported version.

```typescript
class VersionError extends StatsError {
  name: 'VersionError'
  version?: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| `version` | `number` | The unsupported version number |

**Thrown by:**
- `createStatBlock()` with `fromJSON` — When version is unsupported

**Common causes:**
- Loading data from a future library version
- Corrupted save data

**Example:**

```typescript
import { createStatBlock, VersionError } from '@motioneffector/stats'

try {
  createStatBlock(
    { health: { base: 100 } },
    { fromJSON: { version: 999, stats: {}, modifiers: {} } }
  )
} catch (error) {
  if (error instanceof VersionError) {
    console.log(`Unsupported version: ${error.version}`)
  }
}
```

---

## Error Handling Pattern

```typescript
import {
  roll,
  createStatBlock,
  createDerivedStat,
  ParseError,
  ValidationError,
  CircularDependencyError,
  VersionError,
  StatsError
} from '@motioneffector/stats'

try {
  // Your code here
} catch (error) {
  if (error instanceof ParseError) {
    // Handle invalid dice notation
  } else if (error instanceof ValidationError) {
    // Handle validation failures
  } else if (error instanceof CircularDependencyError) {
    // Handle circular dependencies
  } else if (error instanceof VersionError) {
    // Handle version mismatch
  } else if (error instanceof StatsError) {
    // Handle any other library error
  } else {
    // Re-throw unknown errors
    throw error
  }
}
```

---

## Related

- **[Dice API](API-Dice)** — Functions that throw `ParseError`
- **[Stat Block API](API-Stat-Block)** — Functions that throw `ValidationError`
- **[Checks API](API-Checks)** — Functions that throw `CircularDependencyError`
