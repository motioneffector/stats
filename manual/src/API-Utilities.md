# Utilities API

Helper functions for templates and random tables.

---

## `createStatTemplate()`

Create a reusable stat block template.

**Signature:**

```typescript
function createStatTemplate(config: StatTemplateConfig): StatTemplate
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `StatTemplateConfig` | Yes | Template configuration |

**Returns:** `StatTemplate` — Template that can create stat blocks

**Example:**

```typescript
import { createStatTemplate } from '@motioneffector/stats'

const goblinTemplate = createStatTemplate({
  stats: {
    strength: { default: 8, min: 1, max: 20 },
    health: { default: 7, min: 0 }
  }
})

const goblin = goblinTemplate.create()
const toughGoblin = goblinTemplate.create({ health: 14 })
```

---

## StatTemplate Methods

### `create()`

Create a new stat block from the template.

**Signature:**

```typescript
create(overrides?: Record<string, number>): StatBlock
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `overrides` | `Record<string, number>` | No | Values to override defaults |

**Returns:** `StatBlock` — A new stat block

**Example:**

```typescript
const goblin = goblinTemplate.create()              // Use all defaults
const boss = goblinTemplate.create({ health: 50 })  // Override health
```

---

## `rollTable()`

Select a random entry from a weighted table.

**Signature:**

```typescript
function rollTable<T>(entries: RollTableEntry<T>[]): T
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entries` | `RollTableEntry<T>[]` | Yes | Array of weighted entries |

**Returns:** `T` — The selected entry's value

**Example:**

```typescript
import { rollTable } from '@motioneffector/stats'

const loot = rollTable([
  { weight: 10, value: 'gold' },
  { weight: 5, value: 'potion' },
  { weight: 1, value: 'rare sword' }
])

console.log(loot) // e.g., 'gold'
```

**Throws:**

- `ValidationError` — If table is empty, has negative weights, or all weights are zero

---

## Types

### `StatTemplateConfig`

```typescript
interface StatTemplateConfig {
  stats: Record<string, {
    default: number
    min?: number
    max?: number
  }>
  options?: StatBlockOptions
}
```

| Property | Type | Description |
|----------|------|-------------|
| `stats` | `Record<...>` | Stat definitions with default values |
| `options` | `StatBlockOptions` | Options passed to created stat blocks |

### `StatTemplate`

```typescript
interface StatTemplate {
  create(overrides?: Record<string, number>): StatBlock
}
```

### `RollTableEntry<T>`

```typescript
interface RollTableEntry<T> {
  weight: number
  value: T
}
```

| Property | Type | Description |
|----------|------|-------------|
| `weight` | `number` | Relative probability (higher = more likely) |
| `value` | `T` | The value returned if selected |

---

## Related

- **[Using Stat Templates](Guide-Using-Stat-Templates)** — Template usage guide
- **[Using Roll Tables](Guide-Using-Roll-Tables)** — Roll table patterns
