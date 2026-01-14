import {
  roll,
  createStatBlock,
  check,
  createDerivedStat,
  contest,
  rollTable,
  ParseError,
  ValidationError
} from '../dist/index.js'
import { runVisualDemo } from './demo-mode.js'

// ============================================
// TEST RUNNER
// ============================================

export const testRunner = {
  tests: [],
  results: [],
  running: false,

  register(name, fn) {
    this.tests.push({ name, fn })
  },

  async run() {
    if (this.running) return
    this.running = true
    this.results = []

    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')
    const summary = document.getElementById('test-summary')
    const passedCount = document.getElementById('passed-count')
    const failedCount = document.getElementById('failed-count')
    const skippedCount = document.getElementById('skipped-count')
    const runBtn = document.getElementById('run-tests')

    runBtn.disabled = true
    output.innerHTML = ''
    summary.classList.add('hidden')
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'

    let passed = 0
    let failed = 0

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i]
      const progress = ((i + 1) / this.tests.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Running: ${test.name}`

      try {
        await test.fn()
        passed++
        this.results.push({ name: test.name, passed: true })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon pass">✓</span>
            <span class="test-name">${escapeHtml(test.name)}</span>
          </div>
        `
      } catch (e) {
        failed++
        this.results.push({ name: test.name, passed: false, error: e.message })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon fail">✗</span>
            <div>
              <div class="test-name">${escapeHtml(test.name)}</div>
              <div class="test-error">${escapeHtml(e.message)}</div>
            </div>
          </div>
        `
      }

      output.scrollTop = output.scrollHeight
      await new Promise(r => setTimeout(r, 20))
    }

    progressFill.classList.add(failed === 0 ? 'success' : 'failure')
    progressText.textContent = `Complete: ${passed}/${this.tests.length} passed`

    passedCount.textContent = passed
    failedCount.textContent = failed
    skippedCount.textContent = 0
    summary.classList.remove('hidden')

    // Run visual demo after tests complete
    await new Promise(r => setTimeout(r, 500))
    await runVisualDemo()

    runBtn.disabled = false
    this.running = false
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ============================================
// REGISTER TESTS
// ============================================

// Dice tests
testRunner.register('roll: basic 1d20', () => {
  const result = roll('1d20')
  if (result.total < 1 || result.total > 20) throw new Error(`Expected 1-20, got ${result.total}`)
})

testRunner.register('roll: 2d6 returns correct structure', () => {
  const result = roll('2d6')
  if (!result.rolls || result.rolls.length < 2) throw new Error('Expected at least 2 rolls')
  if (result.total !== result.rolls.reduce((a, b) => a + b, 0)) throw new Error('Total mismatch')
})

testRunner.register('roll: modifier 2d6+5', () => {
  const result = roll('2d6+5')
  if (result.modifier !== 5) throw new Error(`Expected modifier 5, got ${result.modifier}`)
})

testRunner.register('roll: negative modifier 1d20-3', () => {
  const result = roll('1d20-3')
  if (result.modifier !== -3) throw new Error(`Expected modifier -3, got ${result.modifier}`)
})

testRunner.register('roll: keep highest 4d6kh3', () => {
  const result = roll('4d6kh3')
  if (result.kept.length !== 3) throw new Error(`Expected 3 kept dice, got ${result.kept.length}`)
})

testRunner.register('roll: drop lowest 4d6dl1', () => {
  const result = roll('4d6dl1')
  if (result.kept.length !== 3) throw new Error(`Expected 3 kept dice, got ${result.kept.length}`)
})

testRunner.register('roll: ParseError on invalid notation', () => {
  try {
    roll('invalid')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw new Error(`Expected ParseError, got ${e.constructor.name}`)
  }
})

testRunner.register('roll: ParseError on empty string', () => {
  try {
    roll('')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
  }
})

testRunner.register('roll: ParseError on zero dice', () => {
  try {
    roll('0d6')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
  }
})

// Stat block tests
testRunner.register('createStatBlock: creates with base values', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.register('createStatBlock: respects min bound', () => {
  const stats = createStatBlock({ str: { base: 10, min: 1 } })
  stats.set('str', -5)
  if (stats.get('str') !== 1) throw new Error(`Expected 1, got ${stats.get('str')}`)
})

testRunner.register('createStatBlock: respects max bound', () => {
  const stats = createStatBlock({ str: { base: 10, max: 20 } })
  stats.set('str', 100)
  if (stats.get('str') !== 20) throw new Error(`Expected 20, got ${stats.get('str')}`)
})

testRunner.register('createStatBlock: modify adds delta', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.modify('str', 5)
  if (stats.getBase('str') !== 15) throw new Error(`Expected 15, got ${stats.getBase('str')}`)
})

testRunner.register('createStatBlock: has returns true for existing stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (!stats.has('str')) throw new Error('Expected has(str) to be true')
})

testRunner.register('createStatBlock: has returns false for non-existing stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (stats.has('dex')) throw new Error('Expected has(dex) to be false')
})

testRunner.register('createStatBlock: stats() returns stat names', () => {
  const stats = createStatBlock({ str: { base: 10 }, dex: { base: 14 } })
  const names = stats.stats()
  if (!names.includes('str') || !names.includes('dex')) throw new Error('Missing stat names')
})

// Modifier tests
testRunner.register('addModifier: applies flat modifier', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff' })
  if (stats.get('str') !== 15) throw new Error(`Expected 15, got ${stats.get('str')}`)
})

testRunner.register('addModifier: applies multiply modifier', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 2, source: 'double', type: 'multiply' })
  if (stats.get('str') !== 20) throw new Error(`Expected 20, got ${stats.get('str')}`)
})

testRunner.register('removeModifier: removes by source', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff' })
  stats.removeModifier('str', 'buff')
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.register('tick: decrements duration', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff', duration: 2 })
  stats.tick()
  const duration = stats.getRemainingDuration('str', 'buff')
  if (duration !== 1) throw new Error(`Expected 1, got ${duration}`)
})

testRunner.register('tick: removes expired modifiers', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff', duration: 1 })
  stats.tick()
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.register('clearModifiers: removes all modifiers', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff1' })
  stats.addModifier('str', { value: 3, source: 'buff2' })
  stats.clearModifiers()
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

// Check tests
testRunner.register('check: returns CheckResult structure', () => {
  const stats = createStatBlock({ str: { base: 14 } })
  const result = check(stats, 'str', { difficulty: 10 })
  if (typeof result.success !== 'boolean') throw new Error('Missing success')
  if (typeof result.total !== 'number') throw new Error('Missing total')
  if (typeof result.margin !== 'number') throw new Error('Missing margin')
})

testRunner.register('check: calculates D&D modifier correctly', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  const result = check(stats, 'str', { difficulty: 10 })
  if (result.modifier !== 3) throw new Error(`Expected modifier 3, got ${result.modifier}`)
})

testRunner.register('check: throws on non-existent stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  try {
    check(stats, 'dex', { difficulty: 10 })
    throw new Error('Expected TypeError')
  } catch (e) {
    if (!(e instanceof TypeError)) throw e
  }
})

// Contest tests
testRunner.register('contest: returns winner a, b, or tie', () => {
  const statsA = createStatBlock({ str: { base: 16 } })
  const statsB = createStatBlock({ str: { base: 8 } })
  const result = contest(statsA, 'str', statsB, 'str')
  if (!['a', 'b', 'tie'].includes(result.winner)) throw new Error(`Invalid winner: ${result.winner}`)
})

testRunner.register('contest: with raw modifiers', () => {
  const result = contest(5, 3)
  if (!['a', 'b', 'tie'].includes(result.winner)) throw new Error(`Invalid winner: ${result.winner}`)
})

// Derived stat tests
testRunner.register('createDerivedStat: computes from formula', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  if (stats.get('carry') !== 240) throw new Error(`Expected 240, got ${stats.get('carry')}`)
})

testRunner.register('createDerivedStat: updates when dependency changes', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  stats.set('str', 20)
  if (stats.get('carry') !== 300) throw new Error(`Expected 300, got ${stats.get('carry')}`)
})

testRunner.register('isDerived: returns true for derived stats', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  if (!stats.isDerived('carry')) throw new Error('Expected isDerived to be true')
})

testRunner.register('isDerived: returns false for base stats', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  if (stats.isDerived('str')) throw new Error('Expected isDerived to be false')
})

// Roll table tests
testRunner.register('rollTable: returns a value from entries', () => {
  const entries = [
    { weight: 1, value: 'a' },
    { weight: 1, value: 'b' }
  ]
  const result = rollTable(entries)
  if (!['a', 'b'].includes(result)) throw new Error(`Unexpected result: ${result}`)
})

testRunner.register('rollTable: throws on empty table', () => {
  try {
    rollTable([])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

testRunner.register('rollTable: throws on negative weight', () => {
  try {
    rollTable([{ weight: -1, value: 'a' }])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

testRunner.register('rollTable: throws on all zero weights', () => {
  try {
    rollTable([{ weight: 0, value: 'a' }])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

// Serialization tests
testRunner.register('toJSON: serializes stat block', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  stats.addModifier('str', { value: 4, source: 'buff', duration: 3 })
  const json = stats.toJSON()
  if (json.version !== 1) throw new Error('Expected version 1')
  if (json.stats.str !== 16) throw new Error('Expected str base 16')
})

testRunner.register('fromJSON: restores stat block', () => {
  const original = createStatBlock({ str: { base: 16 } })
  original.addModifier('str', { value: 4, source: 'buff', duration: 3 })
  const json = original.toJSON()

  const restored = createStatBlock({ str: { base: 10 } }, { fromJSON: json })
  if (restored.getBase('str') !== 16) throw new Error('Base not restored')
  if (restored.get('str') !== 20) throw new Error('Modifier not restored')
})

// Event tests
testRunner.register('onChange: fires on stat change', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  let fired = false
  stats.onChange(() => { fired = true })
  stats.set('str', 15)
  if (!fired) throw new Error('onChange not fired')
})

testRunner.register('onStat: fires only for specific stat', () => {
  const stats = createStatBlock({ str: { base: 10 }, dex: { base: 10 } })
  let strFired = false
  stats.onStat('str', () => { strFired = true })
  stats.set('dex', 15)
  if (strFired) throw new Error('onStat fired for wrong stat')
  stats.set('str', 15)
  if (!strFired) throw new Error('onStat not fired for correct stat')
})

testRunner.register('onChange: unsubscribe works', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  let count = 0
  const unsub = stats.onChange(() => { count++ })
  stats.set('str', 15)
  unsub()
  stats.set('str', 20)
  if (count !== 1) throw new Error(`Expected 1 call, got ${count}`)
})

// ============================================
// INITIALIZE TEST RUNNER
// ============================================

export function initTestRunner() {
  document.getElementById('run-tests').addEventListener('click', () => testRunner.run())
}
