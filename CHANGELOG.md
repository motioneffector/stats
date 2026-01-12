# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Dice Rolling System
- `roll(notation)` - Parse and execute dice notation (e.g., "2d6+3", "1d20kh1", "4d6!")
- Support for standard dice notation (NdX+M)
- Keep highest/lowest dice (kh/kl modifiers)
- Drop highest/lowest dice (dh/dl modifiers)
- Exploding dice (! modifier)
- Reroll mechanics (r operator with conditions: =, <, >, <=, >=)
- Comprehensive error handling with ParseError for invalid notation
- Full JSDoc documentation

#### Stat Block Management
- `createStatBlock(definitions)` - Create stat blocks with base values and bounds
- Stat modification: `set()`, `modify()`, `get()`, `getBase()`
- Flat and multiply modifiers with proper order of operations
- Duration system: permanent, temporary (1 turn), and custom duration modifiers
- Modifier management: `addModifier()`, `removeModifier()`, `getModifiers()`, `clearModifiers()`
- Time progression: `tick()` for duration countdown
- Change event system: `onChange()` and `onStat()` callbacks
- Serialization: `toJSON()` and `fromJSON` for save/load
- Derived stats that automatically recalculate when dependencies change
- Circular dependency detection for derived stats

#### Stat Checks and Utilities
- `check(statBlock, statName, options)` - Perform stat checks with D&D 5e-style mechanics
- Advantage/disadvantage system (roll twice, take higher/lower)
- Custom dice notation support
- Bonus and modifier override options
- `saveThrow()` - Simplified boolean check
- `contest()` - Opposed rolls between two stat blocks or raw modifiers
- `createDerivedStat()` - Create computed stats with dependency tracking
- `rollTable()` - Weighted random table selection
- Custom modifier formulas for different game systems
- Full JSDoc documentation

#### Stat Templates
- `createStatTemplate(config)` - Create reusable stat block templates
- Template instantiation with override values
- Independent instances from same template

#### Type Safety
- Comprehensive TypeScript types for all APIs
- Strict mode compilation with all safety flags enabled
- exactOptionalPropertyTypes support
- noUncheckedIndexedAccess support

#### Error Handling
- `ParseError` - Dice notation parsing errors
- `ValidationError` - Invalid configuration or parameters
- `CircularDependencyError` - Circular dependencies in derived stats
- `VersionError` - Incompatible save data versions

#### Testing
- 367 comprehensive test cases
- 100% specification coverage
- Deterministic testing with mocked randomness
- Tests for all edge cases and error conditions

### Technical Details
- Built with TypeScript 5.7 and Vite
- ES module export format
- Strict TypeScript compilation
- ESLint with strict type checking
- Prettier code formatting
- Comprehensive JSDoc documentation
- Tree-shakeable exports

[Unreleased]: https://github.com/motioneffector/stats/compare/v0.0.0...HEAD
