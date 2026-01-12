# Module Development Work Order

Generic instructions for building any `@motioneffector` library module. Follow these steps in order.

---

## Prerequisites

Before starting, ensure you have:
- Node.js 18+
- pnpm (preferred) or npm
- The module folder already exists with README.md and TESTS.md

---

## Phase 1: Orientation

### 1.1 Read Required Documentation

Read these files in order. Do not skip any.

```
1. STYLE.md          - Coding standards (in module root)
2. README.md         - Public API and usage examples
3. TESTS.md          - Test specifications (this is your implementation contract)
```

**Key understanding checkpoints:**
- [ ] I understand the public API surface from README.md
- [ ] I understand every test case in TESTS.md
- [ ] I understand the code style requirements from STYLE.md

### 1.2 Clarify Ambiguities

If anything in TESTS.md or README.md is unclear or contradictory:
1. Stop
2. Document the question
3. Get clarification before proceeding

Do NOT make assumptions about intended behavior.

---

## Phase 2: Project Setup

### 2.1 Initialize Package Structure

Ensure the following structure exists:

```
module-name/
├── src/
│   ├── index.ts          # Public exports only
│   ├── types.ts          # Public type definitions
│   └── errors.ts         # Custom error classes
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── TESTS.md
├── STYLE.md
└── CHANGELOG.md
```

### 2.2 Configure package.json

```json
{
  "name": "@motioneffector/module-name",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

### 2.3 Configure TypeScript

Use strict mode as specified in STYLE.md:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2.4 Configure Vite

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [] // Add peer dependencies here
    }
  }
})
```

### 2.5 Configure Prettier

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 2.6 Install Dependencies

```bash
pnpm install
```

---

## Phase 3: Define Types and Errors

### 3.1 Create Error Classes

In `src/errors.ts`, define all error types mentioned in TESTS.md:

```typescript
export class ModuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleError'
  }
}

// Add specific error types as specified in TESTS.md
```

### 3.2 Create Type Definitions

In `src/types.ts`, define all public types:

```typescript
// Define interfaces for all public API contracts
// These should match what README.md documents
```

**Checklist:**
- [ ] Every public function's parameters have types
- [ ] Every public function's return value has a type
- [ ] All options objects have interfaces
- [ ] All callback signatures are typed

---

## Phase 4: Write Tests First (TDD)

### 4.1 Create Test Files

For each section in TESTS.md, create corresponding test file(s):

```
TESTS.md Section          →  Test File
─────────────────────────────────────────
## 1. Store Creation      →  src/core/store.test.ts
## 2. Basic Operations    →  src/core/store.test.ts (same file)
## 5. Condition Eval      →  src/core/condition-parser.test.ts
```

### 4.2 Translate TESTS.md to Vitest

Follow STYLE.md section 6.1 exactly:

```markdown
### `store.get(key)`

✓ returns value for existing key
✓ returns undefined for missing key
```

Becomes:

```typescript
describe('store.get(key)', () => {
  it('returns value for existing key', () => {
    // Implementation
  })

  it('returns undefined for missing key', () => {
    // Implementation
  })
})
```

**Rules:**
- Test names must match TESTS.md exactly (copy-paste)
- Every `✓` line becomes one `it()` block
- Every `###` heading becomes one `describe()` block
- Nested `####` headings become nested `describe()` blocks

### 4.3 Write Failing Tests

Write ALL tests before writing implementation:

```typescript
it('returns value for existing key', () => {
  const store = createStore({ initial: { name: 'Alice' } })
  expect(store.get('name')).toBe('Alice')
})
```

Run tests to confirm they fail:

```bash
pnpm test:run
```

All tests should fail at this point. If any pass, something is wrong.

---

## Phase 5: Implementation

### 5.1 Create Source Files

Organize implementation files logically:

```
src/
├── index.ts              # Exports only
├── types.ts              # Public types
├── errors.ts             # Error classes
├── core/
│   ├── store.ts          # Main implementation
│   ├── store.test.ts     # Tests (colocated)
│   ├── parser.ts         # Supporting implementation
│   └── parser.test.ts    # Tests (colocated)
└── utils/
    ├── validators.ts     # Internal utilities
    └── validators.test.ts
```

### 5.2 Implement to Pass Tests

Work through tests systematically:

1. Pick a `describe()` block
2. Implement just enough code to pass those tests
3. Run tests: `pnpm test:run`
4. Refactor if needed (tests still pass)
5. Move to next `describe()` block

**Do NOT:**
- Implement features not covered by tests
- Add "nice to have" functionality
- Optimize prematurely

### 5.3 Export Public API

In `src/index.ts`, export only public API:

```typescript
// Functions
export { createStore } from './core/store'

// Errors
export { ValidationError, ParseError } from './errors'

// Types
export type { Store, StoreOptions } from './types'
```

---

## Phase 6: Documentation

### 6.1 Add JSDoc to Public API

Every exported function needs JSDoc:

```typescript
/**
 * Creates a new store instance.
 *
 * @param options - Configuration options
 * @returns A new Store instance
 *
 * @example
 * ```typescript
 * const store = createStore({ initial: { count: 0 } })
 * ```
 *
 * @throws {ValidationError} If options are invalid
 */
export function createStore(options?: StoreOptions): Store {
```

### 6.2 Verify README.md Accuracy

- [ ] All examples in README.md actually work
- [ ] API reference matches implementation
- [ ] No documented features are missing
- [ ] No undocumented features exist

### 6.3 Update CHANGELOG.md

```markdown
# Changelog

## [0.0.1] - YYYY-MM-DD

### Added
- Initial implementation
- Feature X
- Feature Y
```

---

## Phase 7: Quality Checks

### 7.1 Run All Tests

```bash
pnpm test:run
```

**Required: 100% of tests pass.**

### 7.2 Type Check

```bash
pnpm typecheck
```

**Required: Zero type errors.**

### 7.3 Lint

```bash
pnpm lint
```

**Required: Zero lint errors.**

### 7.4 Format

```bash
pnpm format
```

### 7.5 Build

```bash
pnpm build
```

**Required: Build succeeds with no errors.**

### 7.6 Manual Checklist

From STYLE.md appendix:

**Code Quality:**
- [ ] No `any` types
- [ ] All public functions have JSDoc
- [ ] All public functions have explicit return types
- [ ] No commented-out code
- [ ] No `console.log` (except in error handlers)
- [ ] No magic numbers/strings (use named constants)

**Testing:**
- [ ] All tests from TESTS.md implemented
- [ ] All tests pass
- [ ] Test names match TESTS.md specification exactly

**Documentation:**
- [ ] README.md examples work
- [ ] CHANGELOG.md updated
- [ ] JSDoc examples are correct

---

## Phase 8: Final Review

### 8.1 Self-Review

Read through all code as if reviewing someone else's work:

- Does it follow STYLE.md?
- Is it the simplest solution that works?
- Would a new developer understand it?

### 8.2 Test as Consumer

Create a simple test script that uses the library as an external consumer would:

```typescript
import { createStore } from '@motioneffector/module-name'

const store = createStore()
// Test basic workflows from README.md
```

### 8.3 Deliverables Checklist

Before marking complete:

- [ ] All TESTS.md specifications have passing tests
- [ ] `pnpm test:run` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] README.md examples verified working
- [ ] CHANGELOG.md updated
- [ ] No TODO comments remain (or all are tracked issues)

---

## Appendix: Common Patterns

### Factory Function Pattern

```typescript
export function createThing(options?: ThingOptions): Thing {
  // Private state via closure
  const state = new Map<string, unknown>()

  // Return public interface
  return {
    get(key) {
      return state.get(key)
    },
    set(key, value) {
      state.set(key, value)
      return this // Enable chaining
    },
  }
}
```

### Validation Pattern

```typescript
function validateKey(key: string): void {
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string')
  }
  if (key.trim() === '') {
    throw new ValidationError('Key cannot be empty')
  }
}
```

### Subscription Pattern

```typescript
type Callback = (value: unknown) => void

function createObservable() {
  const listeners = new Set<Callback>()

  return {
    subscribe(callback: Callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    notify(value: unknown) {
      listeners.forEach(cb => {
        try {
          cb(value)
        } catch (e) {
          console.error('Subscriber error:', e)
        }
      })
    },
  }
}
```

### Error Class Pattern

```typescript
export class ModuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleError'
    // Fix prototype chain for instanceof
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends ModuleError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

---

## Troubleshooting

### Tests won't run
- Check vitest is installed: `pnpm add -D vitest`
- Check test files match pattern: `*.test.ts`

### Type errors in tests
- Use `@ts-expect-error` for intentional type violations
- Import types with `import type { }`

### Build fails
- Check `src/index.ts` exports exist
- Check no circular dependencies
- Run `pnpm typecheck` for specific errors

### Lint errors
- Run `pnpm format` first
- Check STYLE.md for conventions

---

## Module-Specific Notes: @motioneffector/stats

### Key Implementation Areas

1. **Dice Notation Parser** - Parse `2d6+3`, `4d6kh3`, `1d20!`, etc.
2. **Random Number Generation** - Core dice rolling (must be mockable)
3. **Stat Blocks** - Base values, min/max bounds, modifiers
4. **Modifier System** - Temporary/permanent modifiers with sources
5. **Derived Stats** - Stats calculated from other stats
6. **Stat Checks** - Roll + modifier vs difficulty

### Critical: Deterministic Testing

Dice rolls are random. Tests must be deterministic. **Mock `Math.random`.**

### Test Environment Setup

```typescript
// test/setup.ts
import { vi } from 'vitest'

// Helper to create predictable "random" sequence
export function mockRandomSequence(values: number[]) {
  let index = 0
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[index % values.length]
    index++
    return value
  })
}

// Reset between tests
afterEach(() => {
  vi.restoreAllMocks()
})
```

### Test Patterns

**Deterministic Dice Rolling:**
```typescript
it('rolls 1d6 with mocked random', () => {
  // Math.random() returns 0-0.999...
  // For a d6: result = floor(random * 6) + 1
  // random = 0.5 → floor(3) + 1 = 4
  mockRandomSequence([0.5])

  const result = roll('1d6')
  expect(result.total).toBe(4)
  expect(result.rolls).toEqual([4])
})

it('rolls 2d6 summing both dice', () => {
  // First die: 0.0 → 1, Second die: 0.999 → 6
  mockRandomSequence([0.0, 0.999])

  const result = roll('2d6')
  expect(result.total).toBe(7)
  expect(result.rolls).toEqual([1, 6])
})
```

**Dice Notation Parsing:**
```typescript
describe('dice notation parser', () => {
  it('parses simple notation: 1d20', () => {
    mockRandomSequence([0.5])  // 11 on d20
    expect(roll('1d20').total).toBe(11)
  })

  it('parses with modifier: 1d20+5', () => {
    mockRandomSequence([0.5])  // 11 + 5 = 16
    expect(roll('1d20+5').total).toBe(16)
  })

  it('parses negative modifier: 1d20-3', () => {
    mockRandomSequence([0.5])  // 11 - 3 = 8
    expect(roll('1d20-3').total).toBe(8)
  })

  it('parses keep highest: 4d6kh3', () => {
    // Roll 4 dice, keep highest 3
    mockRandomSequence([0.0, 0.33, 0.66, 0.999])  // 1, 3, 5, 6
    const result = roll('4d6kh3')
    expect(result.total).toBe(14)  // 3 + 5 + 6, dropped 1
  })

  it('parses exploding dice: 1d6!', () => {
    // Roll 6, explodes, roll again (3)
    mockRandomSequence([0.999, 0.33])  // 6, then 3
    const result = roll('1d6!')
    expect(result.total).toBe(9)  // 6 + 3
  })
})
```

**Stat Block Operations:**
```typescript
describe('stat blocks', () => {
  it('returns effective value with modifiers', () => {
    const stats = createStatBlock({
      strength: { base: 14, min: 1, max: 20 }
    })

    stats.addModifier('strength', { value: 2, source: 'buff' })

    expect(stats.get('strength')).toBe(16)
    expect(stats.getBase('strength')).toBe(14)
  })

  it('respects max bounds', () => {
    const stats = createStatBlock({
      strength: { base: 18, min: 1, max: 20 }
    })

    stats.addModifier('strength', { value: 5, source: 'buff' })

    expect(stats.get('strength')).toBe(20)  // Capped at max
  })

  it('removes modifier by source', () => {
    const stats = createStatBlock({
      strength: { base: 14 }
    })

    stats.addModifier('strength', { value: 2, source: 'rage' })
    expect(stats.get('strength')).toBe(16)

    stats.removeModifier('strength', 'rage')
    expect(stats.get('strength')).toBe(14)
  })
})
```

**Stat Checks:**
```typescript
describe('stat checks', () => {
  it('succeeds when roll + modifier >= difficulty', () => {
    mockRandomSequence([0.7])  // 15 on d20

    const stats = createStatBlock({ dexterity: { base: 14 } })  // +2 modifier
    const result = check(stats, 'dexterity', { difficulty: 15 })

    // 15 + 2 = 17 >= 15
    expect(result.success).toBe(true)
    expect(result.total).toBe(17)
  })

  it('handles advantage (roll twice, take higher)', () => {
    mockRandomSequence([0.1, 0.8])  // 3 and 17 on d20

    const stats = createStatBlock({ strength: { base: 10 } })
    const result = check(stats, 'strength', {
      difficulty: 15,
      advantage: true
    })

    expect(result.roll).toBe(17)  // Took higher
  })

  it('handles disadvantage (roll twice, take lower)', () => {
    mockRandomSequence([0.1, 0.8])  // 3 and 17 on d20

    const stats = createStatBlock({ strength: { base: 10 } })
    const result = check(stats, 'strength', {
      difficulty: 15,
      disadvantage: true
    })

    expect(result.roll).toBe(3)  // Took lower
  })
})
```

### Derived Stats Testing

```typescript
it('derived stat updates when dependencies change', () => {
  const stats = createStatBlock({
    strength: { base: 16 },
    level: { base: 5 }
  })

  // Carry capacity = strength * 10 + level * 5
  stats.defineDerived('carryCapacity', ['strength', 'level'], (str, lvl) => str * 10 + lvl * 5)

  expect(stats.get('carryCapacity')).toBe(185)  // 160 + 25

  stats.set('strength', 18)
  expect(stats.get('carryCapacity')).toBe(205)  // 180 + 25
})
```

### Common Pitfalls

- Always mock `Math.random` - tests must be deterministic
- Remember `Math.random()` returns `[0, 1)` not `[1, sides]`
- `floor(random * sides) + 1` gives values `1` to `sides`
- Advantage/disadvantage cancel each other out
- Modifier replacement: same source replaces, not stacks
- Derived stats with circular dependencies should throw
